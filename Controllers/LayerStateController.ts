import { ZoomLevel } from "wme-sdk-typings";
import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { AlertType, SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents, DEFAULT_PREFERENCES, SDK_LAYERS, SVLLayerState } from "../svlGlobals";
import Utils, { LabelGraphicInfo } from "../Utils";

type StyleRuleContext = {
    feature?: { properties?: Record<string, any> };
    zoomLevel: number;
};

type LastLabelLookup = {
    feature: object;
    fontSize: number;
    label: string;
    outlineWidth: number;
    info: LabelGraphicInfo;
};

const ARROW_SVG_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="-5 -8 10 10"><polygon points="-3,1 3,1 0,-7" fill="#ffffff" fill-opacity="0.7" stroke="#000000" stroke-width="1.5" stroke-linejoin="round"/></svg>'
)}`;

export default class LayerStateController extends AbstractController {
    private static instance: LayerStateController;
    private currentState: SVLLayerState = SVLLayerState.UNINITIALIZED;
    private svlSDKLayerNames: string[] = [];

    private SVL_PIXEL_SIZE_CACHE = new Map<ZoomLevel, number>();
    private SVL_RESOLUTION_CACHE = new Map<ZoomLevel, number>();
    private lastZoomLevel: ZoomLevel = 16 as ZoomLevel;
    private lastResolution: number = 1.0;
    private lastCenterLat: number = 0.0;
    private metricsRefreshPromise: Promise<void> | null = null;
    private pendingForceClearCaches: boolean = false;
    private gpsPositionTimeoutId: number | undefined;
    private lastLabelLookup: LastLabelLookup | null = null;

    private prefRealSize: boolean = DEFAULT_PREFERENCES.realsize;
    private prefNodeRadius: number = DEFAULT_PREFERENCES.nodeRadius;
    private prefNodeColor: string = DEFAULT_PREFERENCES.nodeColor;
    private prefNodeDeadEndColor: string = DEFAULT_PREFERENCES.nodeDeadEndColor;
    private prefVirtualNodeColor: string = DEFAULT_PREFERENCES.virtualNodeColor;
    private prefFarZoomLabelSize: number = DEFAULT_PREFERENCES.farZoomLabelSize;
    private prefCloseZoomLabelSize: number = DEFAULT_PREFERENCES.closeZoomLabelSize;

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
            await LayerStateController.instance.refreshMapMetrics();
            await LayerStateController.instance.initializeLayers();
            LayerStateController.instance.currentState = SVLLayerState.INITIALIZED;

            LayerStateController.instance.svlSDKLayerNames = Object.values(SDK_LAYERS);

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

            const handleMapLayerChange = ({ layerName }: { layerName: string }) => {
                if (layerName === 'gps_points' || layerName === 'farTurnPathLayer') {
                    void LayerStateController.instance?.updateGPSLayerPosition();
                }
            };

            mediator.wmeSDK.Events.on({
                eventName: "wme-map-layer-added",
                eventHandler: handleMapLayerChange
            });

            mediator.wmeSDK.Events.on({
                eventName: "wme-map-layer-removed",
                eventHandler: handleMapLayerChange
            });

            mediator.subscribe(SVLEvents.SVL_SETTINGS_CHANGED, LayerStateController.instance.updateAfterPreferencesWereChanged.bind(LayerStateController.instance));

            return LayerStateController.instance;
        }
        else {
            throw new Error("LayerStateController is already initialized.");
        }
    }

    private resolveLabelGraphic(context: StyleRuleContext): LabelGraphicInfo {
        const feature = context.feature;
        const props = feature?.properties || {};
        const label = (props['label'] as string) || '';
        const zoomLevel = context.zoomLevel as ZoomLevel;
        const fontSize = this.mediator.isFarZoom(zoomLevel) ? this.prefFarZoomLabelSize : this.prefCloseZoomLabelSize;
        const outlineWidth = (props['outlinewidth'] as number) ?? DEFAULT_PREFERENCES.labelOutlineWidth;

        // OpenLayers evaluates externalGraphic, graphicWidth, and graphicHeight consecutively per feature
        const cached = this.lastLabelLookup;
        if (
            feature &&
            cached &&
            cached.feature === feature &&
            cached.fontSize === fontSize &&
            cached.label === label &&
            cached.outlineWidth === outlineWidth
        ) {
            return cached.info;
        }

        const color = (props['color'] as string) || '#ffffff';
        const outlineColor = (props['outlinecolor'] as string) || '#000000';
        const info = Utils.getLabelGraphicInfo(label, fontSize, color, outlineColor, outlineWidth);
        if (feature) {
            this.lastLabelLookup = {
                feature,
                fontSize,
                label,
                outlineWidth,
                info,
            };
        }
        return info;
    }

    private async initializeLayers(): Promise<void> {
        // Add segment layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer({
            layerName: SDK_LAYERS.SEGMENTS,
            styleContext: {
                'color': (context: StyleRuleContext): string => {
                    const props = context.feature?.properties || {};
                    return (props['color'] as string) || '#000000';
                },
                'width': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    if (this.prefRealSize && !this.mediator.isFarZoom(context.zoomLevel as ZoomLevel)) {
                        const pixelSize = this.getCachedGeodesicPixelSizeSVL(context.zoomLevel as ZoomLevel);
                        return (props['width'] as number) / pixelSize;
                    }
                    return (props['width'] as number) || 1;
                },
                'opacity': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['opacity'] as number) ?? 1.0;
                },
                'dash': (context: StyleRuleContext): string => {
                    const props = context.feature?.properties || {};
                    return (props['dash'] as string) || 'solid';
                },
                'zIndex': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['zIndex'] as number) || 1;
                },
                'display': (context: StyleRuleContext): string | undefined => {
                    const props = context.feature?.properties || {};
                    return props['closeZoomOnly'] === 1 && this.mediator.isFarZoom(context.zoomLevel as ZoomLevel) ? 'none' : undefined;
                },
                'degrees': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['degrees'] as number) || 0;
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
                'degrees': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['degrees'] as number) || 0;
                },
                'zIndex': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['zIndex'] as number) || 1;
                },
                'display': (context: StyleRuleContext): string | undefined => {
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
                        'externalGraphic': ARROW_SVG_DATA_URI,
                        'graphicWidth': 12,
                        'graphicHeight': 14,
                        'fillOpacity': 1,
                        'rotation': '${degrees}',
                        'graphicZIndex': '${zIndex}',
                        'display': '${display}',
                    }
                },
                {
                    predicate: (properties: Record<string, any>) => {
                        return properties['isUnknownDirection'] === 1;
                    },
                    style: {
                        'externalGraphic': null,
                        'graphicName': 'x',
                        'stroke': true,
                        'strokeColor': '#f00',
                        'strokeWidth': 1.5,
                        'fill': true,
                        'fillColor': '#FFFF40',
                        'fillOpacity': 0.7,
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
                'getPointRadius': (context: StyleRuleContext) => {
                    if (this.prefRealSize) {
                        return this.prefNodeRadius * this.getCachedResolutionFactor(context.zoomLevel as ZoomLevel);
                    }
                    return this.prefNodeRadius;
                },
                'shouldDisplay': (context: StyleRuleContext) => {
                    return this.mediator.isFarZoom(context.zoomLevel as ZoomLevel) ? 'none' : 'block';
                },
                'getDefaultColor': () => {
                    return this.prefNodeColor;
                },
                'getDeadEndColor': () => {
                    return this.prefNodeDeadEndColor;
                },
                'getVirtualNodeColor': () => {
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
                    predicate: (properties: Record<string, any>) => {
                        return properties["isVirtualNode"] == 1;
                    },
                    style: {
                        'fillColor': '${getVirtualNodeColor}',
                    }
                },
                {
                    predicate: (properties: Record<string, any>) => {
                        return properties["conSegm"] == 1;
                    },
                    style: {
                        'fillColor': '${getDeadEndColor}',
                    }
                }
            ],
            zIndexing: false // default: false
        });

        // Add the labels layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer({
            layerName: SDK_LAYERS.LABELS,
            styleContext: {
                'externalGraphic': (context: StyleRuleContext): string => {
                    return this.resolveLabelGraphic(context).url;
                },
                'graphicWidth': (context: StyleRuleContext): number => {
                    return this.resolveLabelGraphic(context).width;
                },
                'graphicHeight': (context: StyleRuleContext): number => {
                    return this.resolveLabelGraphic(context).height;
                },
                'degrees': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['degrees'] as number) || 0;
                },
                'zIndex': (context: StyleRuleContext): number => {
                    const props = context.feature?.properties || {};
                    return (props['zIndex'] as number) || 650;
                },
                'display': (context: StyleRuleContext): string | undefined => {
                    const props = context.feature?.properties || {};
                    const zoomLevel = context.zoomLevel as ZoomLevel;
                    const isFar = this.mediator.isFarZoom(zoomLevel);
                    if ((props['closeZoomOnly'] === 1 && isFar) ||
                        (props['farZoomOnly'] === 1 && !isFar)) {
                        return 'none';
                    }
                    const showAtZoom = Number(props['showAtzoom'] ?? 0);
                    if (19 - showAtZoom > zoomLevel) {
                        return 'none';
                    }
                    return undefined;
                }
            },
            styleRules: [
                {
                    style: {
                        'externalGraphic': '${externalGraphic}',
                        'graphicWidth': '${graphicWidth}',
                        'graphicHeight': '${graphicHeight}',
                        'rotation': '${degrees}',
                        'graphicZIndex': '${zIndex}',
                        'display': '${display}',
                        'fillOpacity': 1,
                        'pointerEvents': 'none',
                    }
                }
            ],
            zIndexing: true
        });

        // Add icons layer (SDK)
        await this.mediator.wmeSDK.Map.addLayer(
            {
                layerName: SDK_LAYERS.ICONS,
                styleContext: {
                    'display': (context: StyleRuleContext) => {
                        const props = context.feature?.properties || {};
                        return props['closeZoomOnly'] === 1 && this.mediator.isFarZoom(context.zoomLevel as ZoomLevel) ? 'none' : undefined;
                    },
                    'degrees': (context: StyleRuleContext): number => {
                        const props = context.feature?.properties || {};
                        return (props['degrees'] as number) || 0;
                    }
                },
                styleRules: [
                    {
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
                await this.disableAllSVLLayers(false);
                await this.mediator.wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: SDK_LAYERS.SEGMENTS, isChecked: false });
                this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_DISABLED_BY_USER);
            }
        }
    }

    public async enableAllSVLLayers(): Promise<void> {
        this.currentState = SVLLayerState.VISIBLE;
        // Enable all SDK Layers
        await Promise.all(
            this.svlSDKLayerNames.map((layerName) =>
                this.mediator.wmeSDK.Map.setLayerVisibility({ layerName, visibility: true })
            )
        );

        if (this.mediator.getPreference('disableRoadLayers') ?? DEFAULT_PREFERENCES.disableRoadLayers) {
            await this.disableWMERoadLayer();
        }
        await this.mediator.wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: SDK_LAYERS.SEGMENTS, isChecked: true });
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
        if (shouldEnableWMERoadLayer) {
            await this.enableWMERoadLayer();
        }
    }

    public async tryEnablingSVLRoadLayer(): Promise<boolean> {
        if ([SVLLayerState.INITIALIZED, SVLLayerState.DRAWING_ABORTED, SVLLayerState.AUTOMATICALLY_DISABLED, SVLLayerState.USER_DISABLED].includes(this.currentState)) {
            const zoomThreshold = Number(this.mediator.getPreference('useWMERoadLayerAtZoom') ?? DEFAULT_PREFERENCES.useWMERoadLayerAtZoom);
            if ((await this.mediator.wmeSDK.Map.getZoomLevel()) > zoomThreshold) {
                await this.enableAllSVLLayers();
                return true;
            } else if (this.currentState !== SVLLayerState.AUTOMATICALLY_DISABLED) {
                this.currentState = SVLLayerState.AUTOMATICALLY_DISABLED;
                await this.disableAllSVLLayers(true);
                await this.mediator.wmeSDK.LayerSwitcher.setLayerCheckboxChecked({ name: SDK_LAYERS.SEGMENTS, isChecked: true });
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
        if ([SVLLayerState.VISIBLE, SVLLayerState.INITIALIZED, SVLLayerState.DRAWING_ABORTED].includes(this.currentState)) {
            this.currentState = SVLLayerState.AUTOMATICALLY_DISABLED;
            await this.disableAllSVLLayers(true);
            return true;
        }
        return false;
    }

    private async isWMERoadLayerVisible(): Promise<boolean> {
        try {
            if (typeof this.mediator.wmeSDK.LayerSwitcher.getWMELayerVisibility === 'function') {
                return await this.mediator.wmeSDK.LayerSwitcher.getWMELayerVisibility({ layerName: 'roads' });
            }
            return await this.mediator.wmeSDK.Map.isLayerVisible({ layerName: 'roads' });
        } catch {
            return false;
        }
    }

    private async setWMERoadLayerVisibility(isVisible: boolean): Promise<void> {
        try {
            if (typeof this.mediator.wmeSDK.LayerSwitcher.setWMELayerVisibility === 'function') {
                await this.mediator.wmeSDK.LayerSwitcher.setWMELayerVisibility({ layerName: 'roads', isVisible });
            } else {
                await this.mediator.wmeSDK.LayerSwitcher.setRoadsLayerCheckboxChecked({ isChecked: isVisible });
            }
        } catch (error) {
            this.debugLog('Failed to update WME roads layer visibility', error);
        }
    }

    public async hideWMERoadLayerIfNeeded(): Promise<void> {
        if (
            this.currentState === SVLLayerState.VISIBLE &&
            (this.mediator.getPreference('disableRoadLayers') ?? DEFAULT_PREFERENCES.disableRoadLayers)
        ) {
            if (await this.isWMERoadLayerVisible()) {
                await this.setWMERoadLayerVisibility(false);
            }
        }
    }

    private async disableWMERoadLayer(): Promise<void> {
        if (await this.isWMERoadLayerVisible()) {
            await this.setWMERoadLayerVisibility(false);
        }
    }

    private async enableWMERoadLayer(): Promise<void> {
        if (!(await this.isWMERoadLayerVisible())) {
            await this.setWMERoadLayerVisibility(true);
        }
    }

    public async refreshMapMetrics(clearCaches: boolean = false): Promise<void> {
        if (clearCaches) {
            this.pendingForceClearCaches = true;
        }
        if (this.metricsRefreshPromise) {
            await this.metricsRefreshPromise;
            if (!this.pendingForceClearCaches) {
                return;
            }
        }

        const runRefresh = async (): Promise<void> => {
            const shouldClearCaches = this.pendingForceClearCaches;
            this.pendingForceClearCaches = false;

            const [zoomLevel, resolution, center] = await Promise.all([
                this.mediator.wmeSDK.Map.getZoomLevel(),
                this.mediator.wmeSDK.Map.getMapResolution(),
                this.mediator.wmeSDK.Map.getMapCenter(),
            ]);
            const latChanged = Math.abs(center.lat - this.lastCenterLat) > 0.01;
            this.lastZoomLevel = zoomLevel;
            this.lastResolution = resolution;
            this.lastCenterLat = center.lat;
            if (shouldClearCaches) {
                this.SVL_RESOLUTION_CACHE.clear();
            }
            if (shouldClearCaches || latChanged) {
                this.SVL_PIXEL_SIZE_CACHE.clear();
            }
            this.SVL_RESOLUTION_CACHE.set(zoomLevel, 1.0 / resolution);
            this.SVL_PIXEL_SIZE_CACHE.set(zoomLevel, resolution * Math.cos(center.lat * Utils.PI_OVER_180));
        };

        this.metricsRefreshPromise = runRefresh().finally(() => {
            this.metricsRefreshPromise = null;
        });

        await this.metricsRefreshPromise;
    }

    public getCurrentZoomLevel(): ZoomLevel {
        return this.lastZoomLevel;
    }

    /**
     * Careful! The returned value is 1.0 / resolution!
     */
    private getCachedResolutionFactor(zoomLevel: ZoomLevel): number {
        const cachedValue = this.SVL_RESOLUTION_CACHE.get(zoomLevel);
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
        const cachedValue = this.SVL_PIXEL_SIZE_CACHE.get(zoomLevel);
        if (cachedValue !== undefined) {
            return cachedValue;
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
        const lat_radians = center_lat_4326 * Utils.PI_OVER_180;

        // 4. Calculate the Geodesic Pixel Size: res * Math.cos(lat_radians)
        return resolution_3857 * Math.cos(lat_radians);
    }

    private async setSVLLayerStackFromBase(baseZIndex: number): Promise<number> {
        await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.SEGMENTS, zIndex: baseZIndex });
        await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.ARROWS, zIndex: baseZIndex + 1 });
        await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.NODES, zIndex: baseZIndex + 5 });
        await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.LABELS, zIndex: baseZIndex + 6 });
        await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: SDK_LAYERS.ICONS, zIndex: baseZIndex + 7 });
        return baseZIndex + 7;
    }

    private async updateGPSLayerPosition(trial = 0): Promise<void> {
        if (this.gpsPositionTimeoutId !== undefined) {
            clearTimeout(this.gpsPositionTimeoutId);
            this.gpsPositionTimeoutId = undefined;
        }

        if (trial > 20) {
            this.debugLog('SVL: giving up on getting GPS Layer index');
            return;
        }

        let gpsLayerIndex = 0;
        let currentSVLIndex = 0;
        let segmentsIndex = 0;
        try {
            [gpsLayerIndex, currentSVLIndex, segmentsIndex] = await Promise.all([
                this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: 'gps_points' }),
                this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: SDK_LAYERS.ICONS }),
                this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: SDK_LAYERS.SEGMENTS }),
            ]);
        } catch {
            this.gpsPositionTimeoutId = window.setTimeout(() => {
                this.gpsPositionTimeoutId = undefined;
                void this.updateGPSLayerPosition(trial + 1);
            }, 500);
            return;
        }

        const showSVLUnderGPS = Boolean(this.mediator.getPreference('showUnderGPSPoints'));

        try {
            if (showSVLUnderGPS) {
                if (currentSVLIndex < segmentsIndex) {
                    currentSVLIndex = await this.setSVLLayerStackFromBase(segmentsIndex);
                }
                if (currentSVLIndex >= gpsLayerIndex) {
                    await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: 'gps_points', zIndex: currentSVLIndex + 1 });
                }
            } else if (segmentsIndex <= gpsLayerIndex || currentSVLIndex <= gpsLayerIndex) {
                currentSVLIndex = await this.setSVLLayerStackFromBase(gpsLayerIndex + 15);
            }
        } catch (e) {
            console.error('SVL: Error setting layer z-indexes', e);
        }

        try {
            const farTurnLayerIndex = await this.mediator.wmeSDK.Map.getLayerZIndex({ layerName: 'farTurnPathLayer' });
            if (farTurnLayerIndex <= currentSVLIndex) {
                await this.mediator.wmeSDK.Map.setLayerZIndex({ layerName: 'farTurnPathLayer', zIndex: currentSVLIndex + 2 });
            }
        } catch {
            // farTurnPathLayer is optional in WME until turn paths are shown; ignore if absent
        }
    }

    private async updateAfterPreferencesWereChanged(): Promise<void> {
        this.prefRealSize = Boolean(this.mediator.getPreference('realsize') ?? DEFAULT_PREFERENCES.realsize);
        this.prefNodeRadius = this.mediator.getPreference('nodeRadius') ?? DEFAULT_PREFERENCES.nodeRadius;
        this.prefNodeColor = this.mediator.getPreference('nodeColor') || DEFAULT_PREFERENCES.nodeColor;
        this.prefNodeDeadEndColor = this.mediator.getPreference('nodeDeadEndColor') || DEFAULT_PREFERENCES.nodeDeadEndColor;
        this.prefVirtualNodeColor = this.mediator.getPreference('virtualNodeColor') || DEFAULT_PREFERENCES.virtualNodeColor;
        this.prefFarZoomLabelSize = this.mediator.getPreference('farZoomLabelSize') ?? DEFAULT_PREFERENCES.farZoomLabelSize;
        this.prefCloseZoomLabelSize = this.mediator.getPreference('closeZoomLabelSize') ?? DEFAULT_PREFERENCES.closeZoomLabelSize;
        this.lastLabelLookup = null;

        await this.mediator.wmeSDK.Map.setLayerOpacity({
            layerName: SDK_LAYERS.SEGMENTS,
            opacity: this.mediator.getPreference('layerOpacity') ?? DEFAULT_PREFERENCES.layerOpacity,
        });
        await this.updateGPSLayerPosition();

        if (this.currentState === SVLLayerState.VISIBLE) {
            if (this.mediator.getPreference('disableRoadLayers') ?? DEFAULT_PREFERENCES.disableRoadLayers) {
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
