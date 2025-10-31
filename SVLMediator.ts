import RenderingController from "./Controllers/RenderingController";
import WMEEventsController from "./Controllers/WMEEventsController";
import LayerStateController from "./Controllers/LayerStateController";
import PreferencesController from "./Controllers/PreferencesController";
import LocalizationController from "./Controllers/LocalizationController";
import { WmeSDK } from "wme-sdk-typings";
import AbstractMediator, { AlertType, SVLEvents } from "./Controllers/AbstractMediator";

export const SDK_LAYERS = {
    SEGMENTS: "Street Vector Layer (SVL)",
    ARROWS: "SVL_ARROWS_SDK",
    NODES: "SVL_NODES_SDK",
    //LABELS: "SVL_LABELS_SDK",
    ICONS: "SVL_ICONS_SDK" // e.g. average speed cameras
}

export const OL_LAYERS = {
    LABELS: "vectorLabels"
}

export default class SVLMediator extends AbstractMediator {
    // Singleton pattern
    private static instance: SVLMediator | null = null;
    readonly wmeSDK: WmeSDK;
    private renderingController: RenderingController | null = null;
    private eventsController: WMEEventsController | null = null;
    private layerStateController: LayerStateController | null = null;
    private preferencesController: PreferencesController | null = null;
    private localizationController: LocalizationController;
    private wazeWrap: typeof WazeWrap | null = null;
    public readonly SVL_VERSION: string = GM_info.script.version;

    private constructor({ wmeSDK }: { wmeSDK: WmeSDK }) {
        super();
        // Private constructor to prevent direct instantiation
        this.wmeSDK = wmeSDK;
        LocalizationController.initialize({ mediator: this });
        this.localizationController = LocalizationController.getInstance();
        this.localizationController.initializationCompleted().then(() => {
            PreferencesController.initialize({ mediator: this });
            this.preferencesController = PreferencesController.getInstance();
            this.preferencesController.initializationCompleted().then(() => {
                LayerStateController.initialize({
                    mediator: this,
                    disableRoadLayer: <boolean>(this.preferencesController!.getPreference('disableRoadLayer')) ?? true,
                    roadLayerUniqueName: 'roads',
                    svlSDKLayerNames: Object.values(SDK_LAYERS),
                    svlOLLayerNames: Object.values(OL_LAYERS),
                });
                this.layerStateController = LayerStateController.getInstance();
                this.layerStateController.initializationCompleted().then(() => {
                    RenderingController.initialize({ mediator: this });
                    this.renderingController = RenderingController.getInstance();
                    WMEEventsController.initialize({ mediator: this });
                    this.eventsController = WMEEventsController.getInstance();
                });
            });
            this.setInitializationCompleted();
            this.emit(SVLEvents.INITIALIZED);
        }).catch((error) => {
            console.error("SVL: Error during LocalizationController initialization:", error);
        });
    }

    public setWazeWrap(wazeWrap: typeof WazeWrap): void {
        this.wazeWrap = wazeWrap;
    }

    public notify(sender: any, event: any): void {
        // TODO
        //alert(`SVLMediator notified by ${sender} of event ${event}`);
    }

    public alert(type: AlertType, message: string): void {
        if (!this.wazeWrap) {
            alert(message);
            return;
        }
        try {
            this.wazeWrap.Alerts[type](GM_info.script.name, message);
        } catch (e) {
            console.error(e);
            alert(message);
        }
    }

    public _(key: string, ...args: any[]): string {
        return this.localizationController.translate(key, ...args);
    }

    public getWmeSDK(): WmeSDK {
        return this.wmeSDK;
    }
    public static getInstance(): SVLMediator {
        if (!SVLMediator.instance) {
            throw new Error("SVLMediator is not initialized. Call SVLMediator.initialize() first.");
        }
        return SVLMediator.instance;
    }

    public static initialize({ wmeSDK }: { wmeSDK: WmeSDK }): void {
        if (!SVLMediator.instance) {
            SVLMediator.instance = new SVLMediator({ wmeSDK });
        }
    }
}