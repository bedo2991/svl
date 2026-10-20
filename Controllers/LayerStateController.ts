import { ZoomLevel } from "wme-sdk-typings";
import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { AlertType, SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents, OL_LAYERS, SDK_LAYERS, SVLLayerState } from "../svlGlobals";
import Utils from "../Utils";

export default class LayerStateController extends AbstractController {
    private static instance: LayerStateController;
    private currentState: SVLLayerState = SVLLayerState.UNINITIALIZED;
    private svlSDKLayerNames: string[] = [];
    private svlOLLayerNames: string[] = [];


    private SVL_PIXEL_SIZE_CACHE = new Map<ZoomLevel, number>();
    private SVL_RESOLUTION_CACHE = new Map<ZoomLevel, number>();
    private lastZoomLevel: ZoomLevel = 16 as ZoomLevel;
    private lastResolution: number = 1.0;
    private lastCenterLat: number = 0.0;
    private olZoomOffset: number = 12;

    private prefRealSize: boolean = false;
    private prefNodeRadius: number = 3.0;
    private prefNodeColor: string = '#0015FF';
    private prefNodeDeadEndColor: string = '#C31CFF';
    private prefVirtualNodeColor: string = '#045419';
    private prefFarZoomLabelSize: number = 14;
    private prefCloseZoomLabelSize: number = 16;

    private labelsVector!: OpenLayers.Layer.Vector;

    private constructor({ mediator }: {
        mediator: SVLMediator
    }) {
        super(mediator);
    }

    public static getInstance(): LayerStateController {
        if (__DEBUG__ && !LayerStateController.instance) {
            throw new Error("StateController is not initialized. Call initialize() first.");
        }
        return LayerStateController.instance;
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<LayerStateController> {
        if (!LayerStateController.instance) {
            LayerStateController.instance = new LayerStateController({
                mediator
            });
            await LayerStateController.instance.waitForLegacyMap();
            await LayerStateController.instance.refreshMapMetrics();
            await LayerStateController.instance.initializeLayers();
            LayerStateController.instance.currentState = SVLLayerState.INITIALIZED;

            LayerStateController.instance.svlSDKLayerNames = Object.values(SDK_LAYERS);
            LayerStateController.instance.svlOLLayerNames = Object.values(OL_LAYERS);

            mediator.subscribe(SVLEvents.COUNTRY_CHANGED, () => {
                void LayerStateController.instance.refreshMapMetrics(true);
            });

            mediator.subscribe(SVLEvents.ZOOM_CHANGED, () => {
                void LayerStateController.instance.refreshMapMetrics();
            });

            mediator.subscribe(SVLEvents.AUTOMATICALLY_DISABLED,
                LayerStateController.instance.disableSVLRoadLayerAutomatically.bind(LayerStateController.instance));

            mediator.subscribe(SVLEvents.DRAWING_ABORTED,
                LayerStateController.instance.disableSVLRoadLayerDueToDrawingAbort.bind(LayerStateController.instance));

            mediator.subscribe(SVLEvents.LAYER_ENABLED,
                LayerStateController.instance.tryEnablingSVLRoadLayer.bind(LayerStateController.instance)
            );

            mediator.wmeSDK.Events.on({
                eventName: "wme-map-layer-removed",
                eventHandler: () => LayerStateController.instance?.updateGPSLayerPosition()
            });

            mediator.subscribe(SVLEvents.SVL_SETTINGS_CHANGED, LayerStateController.instance.updateAfterPreferencesWereChanged.bind(LayerStateController.instance));

            return LayerStateController.instance;
        }
        else {
            throw new Error("LayerStateController is already initialized.");
        }
    }

    private async waitForLegacyMap(maxWaitMs: number = 10000): Promise<void> {
        const start = Date.now();
        while (
            typeof W === 'undefined' ||
            typeof OpenLayers === 'undefined' ||
            !W.map?.getWazeMap?.()?.getOLMap?.()
        ) {
            if (Date.now() - start > maxWaitMs) {
                throw new Error("SVL: Timed out waiting for legacy W.map / OpenLayers to initialize.");
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    private async initializeLayers(): Promise<void> {
        const OLMap = W.map.getWazeMap().getOLMap();
        OpenLayers.Renderer.symbol['myTriangle'] = [-2, 0, 2, 0, 0, -6, -2, 0];

        const labelStyleMap = new OpenLayers.StyleMap({
            'fontFamily': 'Rubik, Open Sans, Alef, helvetica, sans-serif',
            'fontWeight': '800',
            'fontColor': '${color}',
            'labelOutlineColor': '${outlinecolor}',
            'labelOutlineWidth': '${outlinewidth}',
            'label': '${label}',
            'visibility': 'true',
            'angle': '${angle}',
            'pointerEvents': 'none',
            'labelAlign': 'cm', // set to center middle
        });

        this.labelsVector = new OpenLayers.Layer.Vector(OL_LAYERS.LABELS, {
            'styleMap': labelStyleMap,
            'visibility': false,
        });

        const labelsIndexer = (this.labelsVector.renderer as any)?.indexer;
        if (labelsIndexer) {
            labelsIndexer.svlGetNextElement = function (index: number): HTMLElement | null {
                for (let i = index + 1; i < this.order.length; i++) {
                    const nextElement = document.getElementById(this.order[i]);
                    if (nextElement) {
                        return nextElement;
                    }
                }
                return null;
            };
            labelsIndexer.insert = function (newNode: HTMLElement): HTMLElement | null {
                const nodeId = newNode.id;
                if (this.indices[nodeId] != null) {
                    this.remove(newNode);
                }

                this.determineZIndex(newNode);

                let leftIndex: number = -1;
                let rightIndex: number = this.order.length;
                let middle: number;

                while (rightIndex - leftIndex > 1) {
                    middle = Math.trunc((leftIndex + rightIndex) / 2);

                    const placement = this.compare(
                        this,
                        newNode,
                        document.getElementById(this.order[middle])
                    );

                    if (placement > 0) {
                        leftIndex = middle;
                    } else {
                        rightIndex = middle;
                    }
                }

                this.order.splice(rightIndex, 0, nodeId);
                this.indices[nodeId] = this.getZIndex(newNode);

                return this.svlGetNextElement(rightIndex);
            };
        }

        /**
         *
         * @param {string} id
         * @param {OpenLayers.Geometry} geometry
         * @param {Object} style
         * @param {string} featureId
         * @returns
         */
        this.labelsVector.renderer.redrawNode = function (id: string, geometry: OpenLayers.IGeometry, style: object, featureId: string) {
            style = this.applyDefaultSymbolizer(style);
            // Get the node if it's already on the map.
            var node = this.nodeFactory(id, this.getNodeType(geometry, style));

            // Set the data for the node, then draw it.
            node['_featureId'] = featureId;
            node['_boundsBottom'] = geometry.getBounds()?.bottom;
            node['_geometryClass'] = geometry.CLASS_NAME;
            node['_style'] = style;

            var drawResult = this.drawGeometryNode(node, geometry, style);
            if (drawResult === false) {
                return false;
            }

            node = drawResult.node;

            if (node.parentNode !== this.vectorRoot) {
                this.vectorRoot.appendChild(node);
            }

            this.postDraw(node);

            return drawResult.complete;
        };

        this.labelsVector.renderer.drawGeometry = function (geometry: OpenLayers.IGeometry, style: Partial<StyleObject>, featureId) {
            let rendered: boolean = false;
            if (style.display != "none") {
                rendered = this.redrawNode(geometry.id, geometry, style,
                    featureId);
            }
            if (rendered === false) {
                var node = document.getElementById(geometry.id);
                if (node) {
                    node.parentNode?.removeChild(node);
                }
            }
            return rendered;
        };

        this.labelsVector.drawFeature = function (feature: OpenLayers.Feature.Vector, style?: Partial<StyleObject> | string, farZoom?: boolean) {
            // don't try to draw the feature with the renderer if the layer is not
            // drawn itself
            if (!this.drawn) {
                return;
            }
            if (typeof style != "object") {
                if (!style && feature.state === OpenLayers.State.DELETE) {
                    style = "delete";
                }
                var renderIntent = style || feature.renderIntent;
                style = feature.style || this.style;
                if (!style) {
                    style = this.styleMap.createSymbolizer(feature, renderIntent) as Partial<StyleObject>;
                }
            }

            var drawn = this.renderer.drawFeature(feature, style, farZoom);
            //TODO remove the check for null when we get rid of Renderer.SVG
            if (drawn === false || drawn === null) {
                this.unrenderedFeatures[feature.id] = feature;
            } else {
                delete this.unrenderedFeatures[feature.id];
            }
        }


        this.labelsVector.moveTo = function (bounds: OpenLayers.Bounds, zoomChanged: boolean, dragging: boolean) {
            OpenLayers.Layer.prototype.moveTo.call(this, bounds, zoomChanged, dragging);

            var coordSysUnchanged = true;
            const farZoom = LayerStateController.instance.mediator.isFarZoom();
            if (!dragging && this.map) {
                this.renderer.root.style.visibility = 'hidden';

                var viewSize = this.map.getSize(),
                    viewWidth = viewSize.w,
                    viewHeight = viewSize.h,
                    offsetLeft = (viewWidth / 2 * this.ratio) - viewWidth / 2,
                    offsetTop = (viewHeight / 2 * this.ratio) - viewHeight / 2;
                offsetLeft += this.map.layerContainerOriginPx.x;
                offsetLeft = -Math.round(offsetLeft);
                offsetTop += this.map.layerContainerOriginPx.y;
                offsetTop = -Math.round(offsetTop);

                this.div.style.left = offsetLeft + 'px';
                this.div.style.top = offsetTop + 'px';

                var extent = this.map.getExtent().scale(this.ratio);
                coordSysUnchanged = this.renderer.setExtent(extent, zoomChanged);

                this.renderer.root.style.visibility = 'visible';

                // Force a reflow on gecko based browsers to prevent jump/flicker.
                // This seems to happen on only certain configurations; it was originally
                // noticed in FF 2.0 and Linux.
                if (OpenLayers.IS_GECKO === true) {
                    this.div.scrollLeft = this.div.scrollLeft;
                }

                if (!zoomChanged && coordSysUnchanged) {
                    for (var i in this.unrenderedFeatures) {
                        const feature = this.unrenderedFeatures[i];
                        this.drawFeature(feature, undefined, farZoom);
                    }
                }
            }

            if (!this.drawn || zoomChanged || !coordSysUnchanged) {
                this.drawn = true;
                for (let i: number = 0, len = this.features.length; i < len; i++) {
                    this.renderer.locked = (i !== (len - 1));
                    const feature = this.features[i];
                    this.drawFeature(feature, undefined, farZoom);
                }
            }
        };

        this.labelsVector.addFeatures = function (features: Array<OpenLayers.Feature.Vector | null> | null, options: (object | null) | undefined): void {
            if (!features || features.length === 0) return;

            const farZoom = LayerStateController.instance.mediator.isFarZoom();

            // Track successfully added features for featuresadded event, since
            // beforefeatureadded can veto single features.
            const featuresAdded: OpenLayers.Feature.Vector[] = [];
            for (let i = 0, len = features.length; i < len; i += 1) {
                if (i != (features.length - 1)) {
                    this.renderer.locked = true;
                } else {
                    this.renderer.locked = false;
                }
                let feature = features[i];
                if (!feature) continue;

                //give feature reference to its layer
                feature.layer = this;

                if (!feature.style && this.style) {
                    feature.style = LayerStateController.svlExtend(this.style);
                }

                featuresAdded.push(feature);
                this.features.push(feature);
                this.drawFeature(feature, undefined, farZoom);

            }

            /*     if(notify) {
                    this.events.triggerEvent("featuresadded", {features: featuresAdded});
                } */
        };

        this.labelsVector.renderer.drawFeature = function drawFeature(feature: OpenLayers.Feature.Vector, style?: Partial<StyleObject> | string | object,
            farZoom = LayerStateController.instance.mediator.isFarZoom()) {
            const { zoom } = OLMap;
            let resolvedStyle: Partial<StyleObject> = (style && typeof style === 'object' ? style : feature.style) || {};

            if (feature.geometry) {
                const lsc = LayerStateController.instance;
                // if (bounds) {
                if (
                    7 - feature.attributes.showAtzoom > zoom ||
                    (feature.attributes.closeZoomOnly && farZoom) ||
                    (feature.attributes.farZoomOnly && !farZoom)
                ) {
                    resolvedStyle = { 'display': 'none' };
                } else {
                    const bounds = feature.geometry.getBounds();
                    if (!bounds || !bounds.intersectsBounds(lsc.labelsVector.renderer.extent)) {
                        resolvedStyle = { 'display': 'none' };
                    } else {
                        lsc.labelsVector.renderer.featureDx = 0;
                        resolvedStyle['fontSize'] = farZoom
                            ? lsc.prefFarZoomLabelSize
                            : lsc.prefCloseZoomLabelSize;
                    }
                }

                const rendered = lsc.labelsVector.renderer.drawGeometry(
                    feature.geometry,
                    resolvedStyle,
                    feature.id
                );
                if (
                    resolvedStyle['display'] !== 'none' &&
                    resolvedStyle['label'] &&
                    rendered !== false
                ) {
                    const location = feature.geometry instanceof OpenLayers.Geometry.Point
                        ? feature.geometry
                        : feature.geometry.getCentroid();
                    lsc.labelsVector.renderer.drawText(feature.id, resolvedStyle, location);
                } else {
                    lsc.labelsVector.renderer.removeText(feature.id);
                }
                return rendered;
            }
            return undefined;
        };

        this.labelsVector.renderer.drawText = function drawText(
            featureId,
            style: { [key: string]: any },
            location: OpenLayers.Geometry.Point
        ) {
            const drawOutline = !!style['labelOutlineWidth'];
            // First draw text in halo color and size and overlay the
            // normal text afterwards
            if (drawOutline) {
                const outlineStyle = <Partial<StyleObject>>LayerStateController.svlExtend(style);
                outlineStyle['fontColor'] = outlineStyle['labelOutlineColor'];
                outlineStyle['fontStrokeColor'] = outlineStyle['labelOutlineColor'];
                outlineStyle['fontStrokeWidth'] = style['labelOutlineWidth'];
                if (style['labelOutlineOpacity']) {
                    outlineStyle['fontOpacity'] = style['labelOutlineOpacity'];
                }
                delete outlineStyle['labelOutlineWidth'];
                LayerStateController.instance.labelsVector.renderer.drawText(featureId, outlineStyle, location);
            }

            const resolution = LayerStateController.instance.labelsVector.renderer.getResolution();

            const x: number =
                (location.x - LayerStateController.instance.labelsVector.renderer.featureDx) / resolution +
                LayerStateController.instance.labelsVector.renderer.left;
            const y = location.y / resolution - LayerStateController.instance.labelsVector.renderer.top;

            const suffix = drawOutline
                ? LayerStateController.instance.labelsVector.renderer.LABEL_OUTLINE_SUFFIX
                : LayerStateController.instance.labelsVector.renderer.LABEL_ID_SUFFIX;
            const label = LayerStateController.instance.labelsVector.renderer.nodeFactory(
                featureId + suffix,
                'text'
            );

            label.setAttribute('x', x.toString());
            label.setAttribute('y', (-y).toString());

            if (style['angle'] || style['angle'] === 0) {
                const rotate = `rotate(${style['angle']},${x},${-y})`;
                label.setAttribute('transform', rotate);
            }
            if (style['fontFamily']) {
                label.setAttribute('font-family', style['fontFamily']);
            }
            if (style['fontWeight']) {
                label.setAttribute('font-weight', style['fontWeight']);
            }

            if (style['fontSize']) {
                label.setAttribute('font-size', style['fontSize']);
            }

            if (style['fontColor']) {
                label.setAttribute('fill', style['fontColor']);
            }
            if (style['fontStrokeColor']) {
                label.setAttribute('stroke', style['fontStrokeColor']);
            }

            if (style['fontStrokeWidth']) {
                label.setAttribute('stroke-width', style['fontStrokeWidth']);
            }

            label.setAttribute('pointer-events', 'none');

            const align =
                style['labelAlign'] ?? OpenLayers.Renderer.defaultSymbolizer.labelAlign;
            label.setAttribute(
                'text-anchor',
                OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] ?? 'middle'
            );

            if (OpenLayers.IS_GECKO === true) {
                label.setAttribute(
                    'dominant-baseline',
                    OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] ?? 'central'
                );
            }

            const labelRows = style['label'].split('\n');
            const numRows = labelRows.length;
            while (label.childNodes.length > numRows) {
                if (label.lastChild) {
                    label.removeChild(label.lastChild);
                }
            }
            for (let i = 0; i < numRows; i += 1) {
                const tspan = LayerStateController.instance.labelsVector.renderer.nodeFactory(
                    `${featureId + suffix}_tspan_${i}`,
                    'tspan'
                );
                if (style['labelSelect'] === true) {
                    /* eslint-disable no-underscore-dangle */
                    tspan._featureId = featureId;
                    tspan._geometry = location;
                    tspan._geometryClass = location.CLASS_NAME;
                    /* eslint-enable no-underscore-dangle */
                }
                if (OpenLayers.IS_GECKO === false) {
                    tspan.setAttribute(
                        'baseline-shift',
                        OpenLayers.Renderer.SVG.LABEL_VSHIFT[align[1]] ?? '-35%'
                    );
                }
                tspan.setAttribute('x', String(x));
                if (i === 0) {
                    let vfactor = OpenLayers.Renderer.SVG.LABEL_VFACTOR[align[1]];
                    if (vfactor == null) {
                        vfactor = -0.5;
                    }
                    tspan.setAttribute('dy', `${vfactor * (numRows - 1)}em`);
                } else {
                    tspan.setAttribute('dy', '1em');
                }
                tspan.textContent = labelRows[i] === '' ? ' ' : labelRows[i];
                if (!tspan.parentNode) {
                    label.appendChild(tspan);
                }
            }

            if (!label.parentNode) {
                LayerStateController.instance.labelsVector.renderer.textRoot.appendChild(label);
            }
        };

        // Add layers to the map

        // Add segment layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer({
            layerName: SDK_LAYERS.SEGMENTS,
            styleContext: {
                'color': (context): string => {
                    const props = context.feature?.properties || {};
                    return props['color'] as string || '#000000';
                },
                'width': (context): number => {
                    const props = context.feature?.properties || {};
                    if (this.prefRealSize && !this.mediator.isFarZoom(context.zoomLevel as ZoomLevel)) {
                        let pixelSize = this.getCachedGeodesicPixelSizeSVL(context.zoomLevel as ZoomLevel);
                        return (props['width'] as number) / pixelSize;
                    }
                    return (props['width'] as number || 1);
                },
                'opacity': (context): number => {
                    const props = context.feature?.properties || {};
                    return props['opacity'] as number || 1.0;
                },
                'dash': (context): string => {
                    const props = context.feature?.properties || {};
                    return props['dash'] as string || 'solid';
                },
                'zIndex': (context): number => {
                    const props = context.feature?.properties || {};
                    return props['zIndex'] as number || 1;
                },
                'display': (context): string | undefined => {
                    const props = context.feature?.properties || {};
                    return props['closeZoomOnly'] === 1 && this.mediator.isFarZoom(context.zoomLevel as ZoomLevel) ? 'none' : undefined;
                },
                'degrees': (context): number => {
                    const props = context.feature?.properties || {};
                    return props['degrees'] as number || 0;
                }
            },
            styleRules: [
                {
                    style: {
                        'pointerEvents': 'none',
                        'strokeColor': '${color}',
                        'strokeWidth': '${width}',
                        'strokeOpacity': '${opacity}',
                        'strokeDashstyle': '${dash}' as any,
                        'strokeLinecap': 'butt',
                        //TODO: only add it ^ for segments with road width (or a very large width)
                        'display': '${display}',
                        'graphicZIndex': '${zIndex}',
                    }
                }
            ],
            zIndexing: true
        });

        // Add arrow layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer({
            layerName: SDK_LAYERS.ARROWS,
            styleContext: {
                'degrees': (context): number => {
                    const props = context.feature?.properties || {};
                    return props['degrees'] as number || 0;
                },
                'zIndex': (context): number => {
                    const props = context.feature?.properties || {};
                    return props['zIndex'] as number || 1;
                },
                'display': (context): string | undefined => {
                    const props = context.feature?.properties || {};
                    const zoomLevel = context.zoomLevel as ZoomLevel;
                    if (props['closeZoomOnly'] === 1 && this.mediator.isFarZoom(zoomLevel)) {
                        return 'none';
                    }
                    if (typeof props['minZoom'] === 'number' && zoomLevel < props['minZoom']) {
                        return 'none';
                    }
                    return undefined;
                },
            },
            styleRules: [
                {
                    style: {
                        'pointerEvents': 'none',
                        'graphicName': 'myTriangle',
                        'rotation': '${degrees}',
                        'stroke': true,
                        'strokeColor': '#000',
                        'graphicZIndex': '${zIndex}',
                        'strokeWidth': 1.5,
                        'fill': true,
                        'fillColor': '#fff',
                        'fillOpacity': 0.7,
                        'pointRadius': 5,
                        'display': '${display}',
                    }
                },
                {
                    predicate: (properties, zoomLevel) => {
                        return properties['isUnknownDirection'] === 1;
                    },
                    style: {
                        'graphicName': 'x',
                        'strokeColor': '#f00',
                        'fillColor': '#FFFF40',
                        'pointRadius': 7,
                        'display': '${display}'
                    }
                }
            ],
            zIndexing: true
        });

        // Add node layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer({
            layerName: SDK_LAYERS.NODES,
            styleContext: {
                'getPointRadius': (context) => {
                    if (this.prefRealSize) {
                        return this.prefNodeRadius * this.getCachedResolutionFactor(context.zoomLevel as ZoomLevel);
                    }
                    return this.prefNodeRadius;
                },
                'shouldDisplay': (context) => {
                    return this.mediator.isFarZoom(context.zoomLevel as ZoomLevel) ? 'none' : 'block';
                },
                'getDefaultColor': (context) => {
                    return this.prefNodeColor;
                },
                'getDeadEndColor': (context) => {
                    return this.prefNodeDeadEndColor;
                },
                'getVirtualNodeColor': (context) => {
                    return this.prefVirtualNodeColor;
                }
            },
            styleRules: [
                {
                    style: {
                        'strokeWidth': 2,
                        'fillColor': '${getDefaultColor}',
                        'strokeColor': '#444',
                        'fillOpacity': 0.9,
                        'pointRadius': '${getPointRadius}',
                        'display': '${shouldDisplay}',
                        'pointerEvents': 'none',
                    }
                },
                {
                    predicate: (properties, zoomLevel) => {
                        return properties["isVirtualNode"] == 1
                    },
                    style: {
                        'fillColor': '${getVirtualNodeColor}',
                    }
                },
                {
                    predicate: (properties, zoomLevel) => {
                        return properties["conSegm"] == 1
                    },
                    style: {
                        'fillColor': '${getDeadEndColor}',
                    }
                }
            ],
            zIndexing: false // default: false
        });

        // Add the labels layer (OpenLayers)
        OLMap.addLayer(this.labelsVector);

        // Add icons layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer(
            {
                layerName: SDK_LAYERS.ICONS,
                styleContext: {
                    'display': (context) => {
                        const props = context.feature?.properties || {};
                        return props['closeZoomOnly'] === 1 && this.mediator.isFarZoom(context.zoomLevel as ZoomLevel) ? 'none' : undefined;
                    },
                    'degrees': (context): number => {
                        const props = context.feature?.properties || {};
                        return props['degrees'] as number || 0;
                    }
                },
                styleRules: [
                    {
                        /* Currently unnecessary, as it is the only icon we have
                        predicate: (properties, zoomLevel) => {
                          return properties['isAverageSpeedCamera'] === 1;
                        },*/
                        style: {
                            'rotation': '${degrees}',
                            'externalGraphic': 'https://raw.githubusercontent.com/bedo2991/svl/master/resources/averagespeed.png',
                            'display': '${display}',
                            'graphicWidth': 62,
                            'graphicHeight': 62,
                            'graphicZIndex': 1500,
                            'fillOpacity': 1,
                            'pointerEvents': 'none'
                        }
                    }
                ]
            }
        );

        // Add the layer checkbox
        await this.mediator.wmeSDK.LayerSwitcher.addLayerCheckbox({
            name: SDK_LAYERS.SEGMENTS,
            isChecked: this.currentState === SVLLayerState.VISIBLE,
        });
        this.mediator.wmeSDK.Events.on({
            eventName: "wme-layer-checkbox-toggled",
            eventHandler: this.manageSVLCheckboxUpdated.bind(this)
        });


        await this.updateAfterPreferencesWereChanged();
    }

    public async enableLayerForTheFirstTime(): Promise<void> {
        if (this.currentState === SVLLayerState.INITIALIZED) {
            if (!this.mediator.getPreference('startDisabled')) {
                try {
                    await this.tryEnablingSVLRoadLayer();
                } catch (error) {
                    console.error('Error enabling/disabling layers:', error);
                }
            } else {
                this.currentState = SVLLayerState.USER_DISABLED;
            }
        }
    }

    public async enableAllSVLLayers(): Promise<void> {
        // Enable all SDK Layers
        await Promise.all(
            this.svlSDKLayerNames.map((layerName) =>
                this.mediator.wmeSDK.Map.setLayerVisibility({ layerName, visibility: true })
            )
        );
        // Enable all OL Layers
        for (let i = 0; i < this.svlOLLayerNames.length; i++) {
            const olLayer = W.map.getLayerByName(this.svlOLLayerNames[i]);
            if (olLayer) {
                olLayer.setVisibility(true);
            }
        }

        if (this.mediator.getPreference('disableRoadLayers') ?? true) {
            await this.disableWMERoadLayer();
        }
        await this.mediator.wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: SDK_LAYERS.SEGMENTS, isChecked: true });
        this.currentState = SVLLayerState.VISIBLE;
        this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_ENABLED);
        this.mediator.notify(this, AcceptedControllerEvents.REDRAW_ALL_REQUEST);
    }

    public async disableAllSVLLayers(shouldEnableWMERoadLayer: boolean = false): Promise<void> {
        // Disable all SDK Layers
        await Promise.all(
            this.svlSDKLayerNames.map((layerName) =>
                this.mediator.wmeSDK.Map.setLayerVisibility({ layerName, visibility: false })
            )
        );
        // Disable all OL Layers
        for (let i = 0; i < this.svlOLLayerNames.length; i++) {
            const olLayer = W.map.getLayerByName(this.svlOLLayerNames[i]);
            if (olLayer) {
                olLayer.setVisibility(false);
            }
        }
        if (shouldEnableWMERoadLayer) {
            await this.enableWMERoadLayer();
        }
    }

    public async tryEnablingSVLRoadLayer(): Promise<boolean> {
        if ([SVLLayerState.INITIALIZED, SVLLayerState.DRAWING_ABORTED, SVLLayerState.AUTOMATICALLY_DISABLED, SVLLayerState.USER_DISABLED].includes(this.currentState)) {
            const zoomThreshold = Number(this.mediator.getPreference('useWMERoadLayerAtZoom')) || 16;
            if ((await this.mediator.wmeSDK.Map.getZoomLevel()) > zoomThreshold) {
                await this.enableAllSVLLayers();
                return true;
            } else if (this.currentState !== SVLLayerState.AUTOMATICALLY_DISABLED) {
                this.mediator.alert(AlertType.INFO, this.mediator._('zoom_in_for_svl'));
                this.mediator.notify(this, AcceptedControllerEvents.SVL_SHOULD_AUTOMATICALLY_DISABLE);
                return false;
            }
        }
        return false;
    }

    public async toggleSVLLayerEnabledState(): Promise<void> {
        if ([SVLLayerState.VISIBLE,
        SVLLayerState.AUTOMATICALLY_DISABLED,
        SVLLayerState.DRAWING_ABORTED].includes(this.currentState)) {
            await this.userDisabledSvl();
        } else {
            await this.tryEnablingSVLRoadLayer();
        }
    }

    public async disableSVLRoadLayerDueToDrawingAbort(): Promise<boolean> {
        if (this.currentState === SVLLayerState.DRAWING_ABORTED) return true;
        if (this.currentState === SVLLayerState.VISIBLE) {
            this.currentState = SVLLayerState.DRAWING_ABORTED;
            await this.disableAllSVLLayers(true);
            return true;
        }
        return false;
    }

    public async disableSVLRoadLayerAutomatically(): Promise<boolean> {
        if (this.currentState === SVLLayerState.AUTOMATICALLY_DISABLED) return true;
        if ([SVLLayerState.VISIBLE, SVLLayerState.USER_DISABLED, SVLLayerState.INITIALIZED, SVLLayerState.DRAWING_ABORTED].includes(this.currentState)) {
            this.currentState = SVLLayerState.AUTOMATICALLY_DISABLED;
            await this.disableAllSVLLayers(true);
            await this.mediator.wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: SDK_LAYERS.SEGMENTS, isChecked: true });
            return true;
        }
        return false;
    }

    private static svlExtend(source: Record<string, any>): Record<string, any> {
        let destination: Record<string, any> = {};
        if (source) {
            for (let property in source) {
                const value = source[property];
                if (value !== undefined) {
                    destination[property] = value;
                }
            }
        }
        return destination;
    }

    private async disableWMERoadLayer(): Promise<void> {
        await this.mediator.wmeSDK.LayerSwitcher.setRoadsLayerCheckboxChecked({ isChecked: false });
        // or this.mediator.wmeSDK.Map.setLayerVisibility({ layerName: this.roadLayerUniqueName, visibility: false });?
    }

    private async enableWMERoadLayer(): Promise<void> {
        await this.mediator.wmeSDK.LayerSwitcher.setRoadsLayerCheckboxChecked({ isChecked: true });
        // or this.mediator.wmeSDK.Map.setLayerVisibility({ layerName: this.roadLayerUniqueName, visibility: true });?
    }

    public async refreshMapMetrics(clearCaches: boolean = false): Promise<void> {
        const [zoomLevel, resolution, center] = await Promise.all([
            this.mediator.wmeSDK.Map.getZoomLevel(),
            this.mediator.wmeSDK.Map.getMapResolution(),
            this.mediator.wmeSDK.Map.getMapCenter(),
        ]);
        const latChanged = Math.abs(center.lat - this.lastCenterLat) > 0.01;
        this.lastZoomLevel = zoomLevel;
        this.lastResolution = resolution;
        this.lastCenterLat = center.lat;
        const olZoom = W.map?.getWazeMap?.()?.getOLMap?.()?.zoom;
        if (typeof olZoom === 'number') {
            this.olZoomOffset = zoomLevel - olZoom;
        }
        if (clearCaches) {
            this.SVL_RESOLUTION_CACHE.clear();
        }
        if (clearCaches || latChanged) {
            this.SVL_PIXEL_SIZE_CACHE.clear();
        }
        this.SVL_RESOLUTION_CACHE.set(zoomLevel, 1.0 / resolution);
        this.SVL_PIXEL_SIZE_CACHE.set(zoomLevel, resolution * Math.cos(center.lat * Utils.PI_OVER_180));
    }

    public getCurrentZoomLevel(): ZoomLevel {
        const olZoom = W.map?.getWazeMap?.()?.getOLMap?.()?.zoom;
        if (typeof olZoom === 'number') {
            return (olZoom + this.olZoomOffset) as ZoomLevel;
        }
        return this.lastZoomLevel;
    }

    /**
     * Careful! The returned value is 1.0 / resolution!
     */
    private getCachedResolutionFactor(zoomLevel: ZoomLevel): number {
        let cachedValue = this.SVL_RESOLUTION_CACHE.get(zoomLevel);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        const resAtZoom = this.lastResolution * Math.pow(2, this.lastZoomLevel - zoomLevel);
        // we do this division here, so that later we can multiply instead of divide, for performance.
        const resolution_factor = 1.0 / resAtZoom;
        this.SVL_RESOLUTION_CACHE.set(zoomLevel, resolution_factor);
        void this.refreshMapMetrics();
        return resolution_factor;
    }

    private getCachedGeodesicPixelSizeSVL(zoomLevel: ZoomLevel): number {
        let cachedValue = this.SVL_PIXEL_SIZE_CACHE.get(zoomLevel);
        if (cachedValue !== undefined) {
            return cachedValue as number;
        }
        const size = this.getGeodesicPixelSize(zoomLevel);
        this.SVL_PIXEL_SIZE_CACHE.set(zoomLevel, size);
        void this.refreshMapMetrics();
        return size;
    }

    private getGeodesicPixelSize(zoomLevel: ZoomLevel): number {
        // 1. Use the cached center latitude in WGS84 degrees.
        const center_lat_4326 = this.lastCenterLat;

        // 2. Scale the resolution in EPSG:3857 (meters/pixel at equator) for the requested zoom level
        const resolution_3857 = this.lastResolution * Math.pow(2, this.lastZoomLevel - zoomLevel);

        // 3. Convert Latitude from degrees to radians.
        // Assuming PI_OVER_180 is Math.PI / 180.
        const lat_radians = center_lat_4326 * Utils.PI_OVER_180;

        // 5. Calculate the Geodesic Pixel Size // res * Math.cos(lat_radians);
        const geodesic_pixel_size_meters = resolution_3857 * Math.cos(lat_radians);

        return geodesic_pixel_size_meters;
    }



    private async updateGPSLayerPosition(trial = 0): Promise<void> {
        if (trial > 20) {
            console.log('SVL: giving up on getting GPS Layer index');
            return;
        }

        let gpsLayerIndex = 0;
        let currentSVLIndex = 0;
        try {
            gpsLayerIndex = await this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: 'gps_points' });
            currentSVLIndex = await this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: SDK_LAYERS.ICONS });
        } catch (e) {
            setTimeout(() => {
                void this.updateGPSLayerPosition(trial + 1);
            }, 500);
            return;
        }

        const showSVLUnderGPS = this.mediator.getPreference('showUnderGPSPoints');

        try {
            if (showSVLUnderGPS && (currentSVLIndex > gpsLayerIndex)) {
                // alert("SHOWUNDER " + gpsLayerIndex + ", SVL: " + currentSVLIndex);
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: 'gps_points', zIndex: currentSVLIndex + 1 });

                // this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.SEGMENTS, zIndex: gpsLayerIndex - 20 });
                // this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.ARROWS, zIndex: gpsLayerIndex - 19 });
                // this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.NODES, zIndex: gpsLayerIndex - 15 });
                // this.labelsVector.setZIndex(gpsLayerIndex - 14);
                // this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.ICONS, zIndex: gpsLayerIndex - 13 });
                // alert("Done: " + this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: 'gps_points' }) + ", SVL: " + this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: SDK_LAYERS.SEGMENTS }));
            } else if (!showSVLUnderGPS && (currentSVLIndex < gpsLayerIndex)) {
                // alert("SHOW_ABOVE " + gpsLayerIndex + ", SVL: " + currentSVLIndex);
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.SEGMENTS, zIndex: gpsLayerIndex + 15 });
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.ARROWS, zIndex: gpsLayerIndex + 16 });
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.NODES, zIndex: gpsLayerIndex + 20 });
                this.labelsVector.setZIndex(gpsLayerIndex + 21);
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.ICONS, zIndex: gpsLayerIndex + 22 });
                // alert("Done: " + this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: 'gps_points' }) + ", SVL: " + this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: SDK_LAYERS.SEGMENTS }));
            }

        } catch (e) {
            console.error('SVL: Error setting layer z-indexes', e);
        }

        try {
            const farTurnLayerIndex = await this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: 'farTurnPathLayer' });
            currentSVLIndex = await this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: SDK_LAYERS.ICONS });
            if (farTurnLayerIndex < currentSVLIndex) {
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: 'farTurnPathLayer', zIndex: currentSVLIndex + 2 });
            }
        } catch (e) {
            console.error(e);
            console.error('SVL: Error setting farTurnPathLayer z-indexes', e);
        }
    }

    private async updateAfterPreferencesWereChanged(): Promise<void> {
        this.prefRealSize = Boolean(this.mediator.getPreference('realsize'));
        this.prefNodeRadius = this.mediator.getPreference('nodeRadius') ?? 3.0;
        this.prefNodeColor = this.mediator.getPreference('nodeColor') || '#0015FF';
        this.prefNodeDeadEndColor = this.mediator.getPreference('nodeDeadEndColor') || '#C31CFF';
        this.prefVirtualNodeColor = this.mediator.getPreference('virtualNodeColor') || '#045419';
        this.prefFarZoomLabelSize = this.mediator.getPreference('farZoomLabelSize') ?? 14;
        this.prefCloseZoomLabelSize = this.mediator.getPreference('closeZoomLabelSize') ?? 16;

        await this.mediator.wmeSDK.Map.setLayerOpacity({ layerName: SDK_LAYERS.SEGMENTS, opacity: this.mediator.getPreference('layerOpacity') });
        await this.updateGPSLayerPosition();

        if (this.currentState === SVLLayerState.VISIBLE) {
            if (this.mediator.getPreference('disableRoadLayers') ?? true) {
                await this.disableWMERoadLayer();
            } else {
                await this.enableWMERoadLayer();
            }
        }
    }

    private async manageSVLCheckboxUpdated({ checked, name }:
        { checked: boolean, name: string }): Promise<void> {
        if (name !== SDK_LAYERS.SEGMENTS) return;

        if (checked) {
            await this.tryEnablingSVLRoadLayer();
        } else {
            await this.userDisabledSvl();
        }
    }

    public getCurrentState(): SVLLayerState {
        return this.currentState;
    }

    private async userDisabledSvl(): Promise<void> {
        if (this.currentState === SVLLayerState.USER_DISABLED) return;
        if ([SVLLayerState.VISIBLE,
        SVLLayerState.DRAWING_ABORTED,
        SVLLayerState.AUTOMATICALLY_DISABLED].includes(this.currentState)) {
            this.currentState = SVLLayerState.USER_DISABLED;
            await this.disableAllSVLLayers(false);
            await this.mediator.wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: SDK_LAYERS.SEGMENTS, isChecked: false });
            this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_DISABLED_BY_USER);
        }
    }
}