import { WmeSDK } from "wme-sdk-typings";
import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";

enum State {
    UNINITIALIZED,
    INITIALIZED,
    VISIBLE,
    DRAWING_ABORTED,
    AUTOMATICALLY_DISABLED,
    USER_DISABLED
}

export default class LayerStateController extends AbstractController {
    private static instance: LayerStateController | null = null;
    private currentState: State = State.UNINITIALIZED;
    private disableRoadLayer: boolean = false;
    private roadLayerUniqueName: string = '';
    private svlSDKLayerNames: string[] = [];
    private svlOLLayerNames: string[] = [];

    private constructor({ mediator, disableRoadLayer, roadLayerUniqueName, svlSDKLayerNames, svlOLLayerNames }: {
        mediator: SVLMediator,
        disableRoadLayer: boolean,
        roadLayerUniqueName: string,
        svlSDKLayerNames: string[],
        svlOLLayerNames: string[]
    }) {
        super(mediator);
        this.disableRoadLayer = disableRoadLayer;
        this.roadLayerUniqueName = roadLayerUniqueName;
        this.svlSDKLayerNames = svlSDKLayerNames;
        this.svlOLLayerNames = svlOLLayerNames;
        this.currentState = State.INITIALIZED;
        this.setInitializationCompleted();
    }

    public static getInstance(): LayerStateController {
        if (!LayerStateController.instance) {
            throw new Error("StateController is not initialized. Call initialize() first.");
        }
        return LayerStateController.instance;
    }

    public static initialize({ mediator, disableRoadLayer, roadLayerUniqueName, svlSDKLayerNames, svlOLLayerNames }:
        { mediator: SVLMediator, disableRoadLayer: boolean, roadLayerUniqueName: string, svlSDKLayerNames: string[], svlOLLayerNames: string[] }): void {
        if (!LayerStateController.instance) {
            LayerStateController.instance = new LayerStateController({
                mediator,
                disableRoadLayer,
                roadLayerUniqueName,
                svlSDKLayerNames,
                svlOLLayerNames
            });

            LayerStateController.instance.enableLayerForTheFirstTime();
        }
    }

    private initializeLayers(): void {

    }

    private enableLayerForTheFirstTime(): void {
        if (this.currentState === State.INITIALIZED) {
            this.initializeLayers();
            try {
                // Enable all SDK Layers
                for (let i = 0; i < this.svlSDKLayerNames.length; i++) {
                    this.mediator.wmeSDK.Map.setLayerVisibility({ layerName: this.svlSDKLayerNames[i], visibility: true });
                }
                // Enable all OL Layers
                debugger;
                for (let i = 0; i < this.svlOLLayerNames.length; i++) {
                    debugger;
                    const olLayer = W.map.getLayerByName(this.svlOLLayerNames[i]);
                    debugger;
                    if (olLayer) {
                        olLayer.setVisibility(true);
                    }
                }

                if (this.disableRoadLayer) {
                    // Disable WME Road Layer
                    this.mediator.wmeSDK.Map.setLayerVisibility({ layerName: this.roadLayerUniqueName, visibility: false });
                }
            } catch (error) {
                console.error('Error enabling layers:', error);
            }
            this.currentState = State.VISIBLE;
        }
    }

    public tryEnablingRoadLayer(): boolean {
        if ([State.DRAWING_ABORTED, State.AUTOMATICALLY_DISABLED, State.USER_DISABLED].includes(this.currentState)) {
            this.currentState = State.VISIBLE;
            return true;
        }
        return false;
    }

    public disableRoadLayerDueToDrawingAbort(): boolean {
        if (this.currentState === State.DRAWING_ABORTED) return true;
        if (this.currentState === State.VISIBLE) {
            this.currentState = State.DRAWING_ABORTED;
            return true;
        }
        return false;
    }

    public disableRoadLayerAutomatically(): boolean {
        if (this.currentState === State.AUTOMATICALLY_DISABLED) return true;
        if (this.currentState === State.VISIBLE) {
            this.currentState = State.AUTOMATICALLY_DISABLED;
            return true;
        }
        return false;
    }

    public setDisableRoadLayer(disable: boolean): void {
        this.disableRoadLayer = disable;
    }
}