import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { Node, SdkFeature, Segment } from "wme-sdk-typings";
import { LineString, Point } from "geojson";
import { AlertType } from "./AbstractMediator";
import LayerStateController from "./LayerStateController";
import { AcceptedControllerEvents, SDK_LAYERS, SVLLayerState } from "../svlGlobals";

export default class RenderingController extends AbstractController {
    // Singleton pattern
    private static instance: RenderingController | null = null;
    // Add throttling to prevent excessive redraws
    private redrawTimeout: number | null = null;

    private queuedSegments: Set<SdkFeature<LineString>> = new Set();
    private queuedArrows: Set<SdkFeature<Point>> = new Set();
    private queuedIcons: Set<SdkFeature<Point>> = new Set();

    private segmentsStore = new Map<Segment['id'], Set<string>>();
    private arrowsStore = new Map<Segment['id'], Set<string>>();
    private iconsStore = new Map<Segment['id'], Set<string>>();



    private constructor({ mediator }: { mediator: SVLMediator }) {
        super(mediator);
    }
    public static getInstance(): RenderingController {
        if (!RenderingController.instance) {
            throw new Error("RenderingController not initialized. Call initialize() first.");
        }
        return RenderingController.instance;
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<RenderingController> {
        if (!RenderingController.instance) {
            RenderingController.instance = new RenderingController({ mediator });
            return RenderingController.instance;
        } else {
            throw new Error("RenderingController is already initialized.");
        }
    }

    public zoomChanged(): void {
        console.debug('zoomChanged running');
        let currentState = this.mediator.getState();
        if (this.mediator.wmeSDK.Map.getZoomLevel() <= +this.mediator.getPreference('useWMERoadLayerAtZoom')) {
            // There is nothing to draw, enable road layer
            console.debug('Road layer automatically enabled because of zoom out');
            // consoleDebug("Vector visibility: ", streetVector.visibility);
            if (currentState === SVLLayerState.VISIBLE) {
                this.mediator.notify(this, AcceptedControllerEvents.SVL_SHOULD_AUTOMATICALLY_DISABLE);
                return;
            }
        } else if (currentState == SVLLayerState.AUTOMATICALLY_DISABLED) {
            // Re-enable the SVL
            console.debug('Re-enabling SVL after zoom in');
            this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_ENABLED);
            return;
        }
    }

    public redrawAll(): void {
        // Logic to redraw all SVL layers
        console.log("Redrawing all SVL layers…");
        debugger;
        // Clear any pending redraw to avoid multiple rapid redraws
        if (this.redrawTimeout !== null) {
            clearTimeout(this.redrawTimeout);
        }

        // Throttle redraw operations to improve performance
        this.redrawTimeout = window.setTimeout(() => {
            this.destroyAllFeatures();
            this.addAllSegmentsSDK();
            this.addAllNodesSDK();
            this.redrawTimeout = null;
        }, 100); // 100ms throttle
    }

    private destroyAllFeatures(): void {
        this.removeAllSegmentsFromLayer();
        //labelsVector.destroyFeatures(labelsVector.features, { 'silent': true });
        this.removeAllNodesFromLayer();
    }

    private addAllSegmentsSDK(): void {

    }

    private addAllNodesSDK(): void {
        const nodes = this.mediator.wmeSDK.DataModel.Nodes.getAll();
        if (!(this.mediator.getState() === SVLLayerState.DRAWING_ABORTED) && nodes.length > this.mediator.getPreference('nodesThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${nodes.length} nodes. The current limit is set to ${this.mediator.getPreference('nodesThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        // TODO: this should not happen here. First the events in layerStateController should fire and manage that
        if (this.mediator.wmeSDK.Map.getZoomLevel() <= this.mediator.getPreference('useWMERoadLayerAtZoom')) {
            console.debug('Not adding nodes them because of the zoom');
            return;
        }

        this.addNodesSDK(nodes);
    }

    private addNodesSDK(nodes: Node[]) {
        let sdkFeatures: SdkFeature<Point>[] = [];
        for (let i = 0; i < nodes.length; i++) {
            let n = nodes[i];
            if (!this.mediator.wmeSDK.DataModel.isDeleted({
                dataModelName: "nodes",
                objectId: n.id
            })) {
                //consoleDebug(`Adding node ${n.id}`);
                sdkFeatures.push(
                    {
                        id: n.id,
                        geometry: n.geometry,
                        properties: {
                            "conSegm": n.connectedSegmentIds.length
                        },
                        type: "Feature",
                    }
                );
            } else {
                // Adding a node that was deleted. This can happen if the map gets moved / zoomed while editing
            }
        }

        this.mediator.wmeSDK.Map.addFeaturesToLayer({
            features: sdkFeatures,
            layerName: SDK_LAYERS.NODES
        })
    }


    private removeAllSegmentsFromLayer() {
        this.queuedSegments.clear();
        this.segmentsStore.clear();

        this.queuedArrows.clear();
        this.arrowsStore.clear();

        this.queuedIcons.clear();
        this.iconsStore.clear();

        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.SEGMENTS
        });

        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.ARROWS
        });

        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.ICONS
        });
    }

    private removeAllNodesFromLayer() {
        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.NODES
        });
    }

}