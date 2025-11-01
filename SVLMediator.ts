import RenderingController from "./Controllers/RenderingController";
import WMEEventsController, { SVLCallbackEventTypes } from "./Controllers/WMEEventsController";
import LayerStateController from "./Controllers/LayerStateController";
import PreferencesController from "./Controllers/PreferencesController";
import LocalizationController from "./Controllers/LocalizationController";
import { WmeSDK } from "wme-sdk-typings";
import AbstractMediator, { AlertType, SVLEvents } from "./Controllers/AbstractMediator";
import UserInterfaceController from "./Controllers/UserInterfaceController";

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

// These events are accepted by the mediator from controllers. Then the mediator decides what to do (probably, firing a SVLEvent)
export enum AcceptedControllerEvents {
    PREFERENCES_EXPORT_REQUEST = 'PREFERENCES_EXPORT_REQUEST',
    PREFERENCES_IMPORT_REQUEST = 'PREFERENCES_IMPORT_REQUEST',
    PREFERENCES_SAVE_REQUEST = 'PREFERENCES_SAVE_REQUEST',
    PREFERENCES_RESET_REQUEST = 'PREFERENCES_RESET_REQUEST',
    PREFERENCES_ROLLBACK_REQUEST = 'PREFERENCES_ROLLBACK_REQUEST',
    REDRAW_ALL_REQUEST = 'REDRAW_ALL_REQUEST',
    PREFERENCES_UI_REQUIRE_REFRESH = 'PREFERENCES_UI_REQUIRE_REFRESH',
    PREFERENCES_UPDATED_REQUIRES_REDRAW = 'PREFERENCES_UPDATED_REQUIRES_REDRAW', //updateStylesFromPreferences
    USER_UPDATED_SVL_PREFERENCES = 'USER_UPDATED_SVL_PREFERENCES',
    WME_SETTINGS_UPDATED = 'WME_SETTINGS_UPDATED',
    SVL_SHOULD_AUTOMATICALLY_DISABLE = 'SVL_SHOULD_AUTOMATICALLY_DISABLE',
    SVL_DRAWING_WAS_ABORTED = 'SVL_DRAWING_WAS_ABORTED',
    FIRST_RUN = 'FIRST_RUN'
}



export default class SVLMediator extends AbstractMediator {
    // Singleton pattern
    private static instance: SVLMediator;
    readonly wmeSDK: WmeSDK;
    private renderingController!: RenderingController;
    private wmeEventsController!: WMEEventsController;
    private layerStateController!: LayerStateController;
    private preferencesController!: PreferencesController;
    private localizationController!: LocalizationController;
    private userInterfaceController!: UserInterfaceController;
    private wazeWrap: typeof WazeWrap | null = null;
    public readonly SVL_VERSION: string = GM_info.script.version;

    private constructor({ wmeSDK }: { wmeSDK: WmeSDK }) {
        super();
        // Private constructor to prevent direct instantiation
        this.wmeSDK = wmeSDK;
    }

    public static async initialize({ wmeSDK }: { wmeSDK: WmeSDK }): Promise<SVLMediator> {
        if (!SVLMediator.instance) {
            SVLMediator.instance = new SVLMediator({ wmeSDK });
            SVLMediator.instance.localizationController = await LocalizationController.initialize({ mediator: SVLMediator.instance });
            SVLMediator.instance.preferencesController = await PreferencesController.initialize({ mediator: SVLMediator.instance });
            SVLMediator.instance.layerStateController = await LayerStateController.initialize({
                mediator: SVLMediator.instance,
                roadLayerUniqueName: 'roads',
                svlSDKLayerNames: Object.values(SDK_LAYERS),
                svlOLLayerNames: Object.values(OL_LAYERS),
            });
            SVLMediator.instance.renderingController = await RenderingController.initialize({ mediator: SVLMediator.instance });
            SVLMediator.instance.wmeEventsController = await WMEEventsController.initialize({ mediator: SVLMediator.instance });
            try {
                SVLMediator.instance.userInterfaceController = await UserInterfaceController.initialize({ mediator: SVLMediator.instance, preferencesController: SVLMediator.instance.preferencesController });
            } catch (e) {
                console.error("Error initializing UserInterfaceController:", e);
                SVLMediator.instance.alert(AlertType.ERROR, `Error initializing SVL User Interface.`);
            }
            SVLMediator.instance.registerCallbacks();

            SVLMediator.instance.emit(SVLEvents.INITIALIZED);
            return SVLMediator.instance;
        } else {
            throw new Error("SVLMediator is already initialized.");
        }
    }

    private registerCallbacks(): void {
        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.COUNTRY_CHANGE,
            sdkName: "wme-map-data-loaded",
            callback: () => {
                this.alert(AlertType.INFO, "Merge end");
            },
            deferInMs: 500
        });
    }

    public setWazeWrap(wazeWrap: typeof WazeWrap): void {
        this.wazeWrap = wazeWrap;
    }

    private handleFirstRun(): void {
        this.alert(
            AlertType.INFO,
            `${this._('first_time')}

                    ${this._('some_info')}
                    ${this._('default_shortcut_instruction')}
                    ${this._('instructions_1')}
                    ${this._('instructions_2')}
                    ${this._('instructions_3')}
                    ${this._('instructions_4')}`
        );
    }

    public notify(sender: any, event: AcceptedControllerEvents): void {
        switch (event) {
            case AcceptedControllerEvents.PREFERENCES_SAVE_REQUEST:
                return this.preferencesController.savePreferences();
            case AcceptedControllerEvents.PREFERENCES_RESET_REQUEST:
                return this.preferencesController.resetPreferences();
            case AcceptedControllerEvents.PREFERENCES_IMPORT_REQUEST:
                return this.preferencesController.importPreferences();
            case AcceptedControllerEvents.PREFERENCES_EXPORT_REQUEST:
                return this.preferencesController.exportPreferences();
            case AcceptedControllerEvents.FIRST_RUN:
                return this.handleFirstRun();
            default:
                console.warn(`Unhandled event type: ${event} from sender:`, sender);
                this.alert(AlertType.WARNING, `Unhandled event type: ${event} from sender: ${sender.constructor.name}`);
                break;
        }
        // TODO
        //alert(`SVLMediator notified by ${sender} of event ${event}`);
    }

    public prompt(title: string, message: string, defaultValue: string = '', okFunction: (input: string) => void): string | null {
        if (!this.wazeWrap) {
            return prompt(message, defaultValue);
        }
        try {
            this.wazeWrap.Alerts.prompt(title, message, defaultValue, okFunction);
        } catch (e) {
            console.error(e);
            let res = prompt(message, defaultValue);
            if (res !== null) {
                okFunction(res);
            }
        }
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

    public getPreference(key: string): any {
        if (!this.preferencesController) {
            throw new Error("PreferencesController is not initialized yet.");
        }
        return this.preferencesController.getPreference(key);
    }

    public setPreference(key: string, value: any): void {
        if (!this.preferencesController) {
            throw new Error("PreferencesController is not initialized yet.");
        }
        this.preferencesController.setPreference(key, value);
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

    public isFarZoom(zoom = this.wmeSDK.Map.getZoomLevel()) {
        return zoom < this.getPreference('switchZoom');
    }

    public areOnlineTranslationsLoaded(): boolean {
        return this.localizationController.getOnlineTranslationsLoaded();
    }


}