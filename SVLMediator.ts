import RenderingController from "./Controllers/RenderingController";
import WMEEventsController, { SVLCallbackEventTypes } from "./Controllers/WMEEventsController";
import LayerStateController from "./Controllers/LayerStateController";
import PreferencesController from "./Controllers/PreferencesController";
import LocalizationController from "./Controllers/LocalizationController";
import { DataModelName, WmeSDK } from "wme-sdk-typings";
import AbstractMediator, { AlertType, SVLEvents } from "./Controllers/AbstractMediator";
import UserInterfaceController from "./Controllers/UserInterfaceController";
import { AcceptedControllerEvents, SVLLayerState } from "./svlGlobals";


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

    private currentTopCountryId: number | null = null;
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
                mediator: SVLMediator.instance
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

            SVLMediator.instance.layerStateController.enableLayerForTheFirstTime();

            SVLMediator.instance.checkCountryChanged();

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
            callback: this.checkCountryChanged.bind(this),
            deferInMs: 1000
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.ZOOM,
            sdkName: "wme-map-zoom-changed",
            deferInMs: 500,
            callback: () => {
                //this.alertDebug(AlertType.WARNING, "Zoom");
                this.renderingController.zoomChanged();
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.WME_SETTINGS_CHANGED,
            sdkName: "wme-user-settings-changed",
            callback: () => {
                this.alertDebug(AlertType.INFO, "WME Settings Changed");
                this.notify(this, AcceptedControllerEvents.WME_SETTINGS_UPDATED);
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DRAWING_ABORTED,
            sdkName: "wme-map-data-loaded",
            callback: () => {
                this.alertDebug(AlertType.INFO, "Drawing Aborted Callback");
                this.renderingController.shouldDrawingResumeAfterAbort();
            },
            deferInMs: 500
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-added",
            callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        this.renderingController.addSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        this.renderingController.addNodesByIds(objectIds as number[]);
                        break;
                }
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-removed",
            callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        this.renderingController.removeSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        this.renderingController.removeNodesByIds(objectIds as number[]);
                        break;
                }
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-changed",
            callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        this.renderingController.updateSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        this.renderingController.updateNodesByIds(objectIds as number[]);
                        break;
                }
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-object-state-deleted",
            callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        this.renderingController.removeSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        this.renderingController.removeNodesByIds(objectIds as number[]);
                        break;
                }
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-saved",
            callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => {
                if (dataModelName === "segments") {
                    this.renderingController.redrawAll();
                    // here we redraw everything, we do it only once for the segments
                }
            }
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.LAYER_VISIBILITY_CHANGED,
            sdkName: "wme-layer-visibility-changed",
            callback: (e: { layerName: string }) => {
                // we only care about the road layer visibility changes
                if (e.layerName !== "roads") return;

                const currentState = this.getState();
                if (currentState === SVLLayerState.USER_DISABLED || currentState === SVLLayerState.AUTOMATICALLY_DISABLED) return;

                // The roadlayer was changed
                if (currentState === SVLLayerState.VISIBLE) {
                    // if SVL is currently enabled, disable it
                    this.wmeSDK.Map.setLayerVisibility({ layerName: "roads", visibility: false })
                }
            }
        });

    }

    private checkCountryChanged(): void {
        //this.alertDebug(AlertType.INFO, "Merge end for country check");
        const topCountry = this.wmeSDK.DataModel.Countries.getTopCountry();
        if (!topCountry) return;

        if (topCountry.id === this.currentTopCountryId) {
            // Country hasn't changed, no need to update
            return;
        }

        this.alertDebug(AlertType.SUCCESS, "Country changed to " + topCountry.name);
        this.currentTopCountryId = topCountry.id;

        this.emit(SVLEvents.COUNTRY_CHANGED, { newCountry: topCountry });
    }

    public debugLog(message: string, ...args: any[]): void {
        if (__DEBUG__) {
            console.debug(`[SVL DEBUG]: ${message}`, ...args);
        }
    }

    public getState(): SVLLayerState {
        return this.layerStateController.getCurrentState();
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
            case AcceptedControllerEvents.SVL_SHOULD_AUTOMATICALLY_DISABLE:
                this.emit(SVLEvents.AUTOMATICALLY_DISABLED);
                break;
            case AcceptedControllerEvents.REDRAW_ALL_REQUEST:
                this.renderingController.redrawAll();
                break;
            case AcceptedControllerEvents.SVL_LAYER_ENABLED:
                this.emit(SVLEvents.LAYER_ENABLED);
                break;
            case AcceptedControllerEvents.SVL_LAYER_DISABLED_BY_USER:
                this.emit(SVLEvents.USER_DISABLED);
                break;
            case AcceptedControllerEvents.KEYBOARD_SHORTCUT_TRIGGERED:
                this.layerStateController.toggleSVLLayerEnabledState();
                break;
            case AcceptedControllerEvents.PREFERENCES_SAVE_REQUEST:
                return this.preferencesController.savePreferences();
            case AcceptedControllerEvents.PREFERENCES_RESET_REQUEST:
                return this.preferencesController.resetPreferences();
            case AcceptedControllerEvents.PREFERENCES_IMPORT_REQUEST:
                return this.preferencesController.importPreferences();
            case AcceptedControllerEvents.PREFERENCES_EXPORT_REQUEST:
                return this.preferencesController.exportPreferences();
            case AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES:
                this.renderingController.redrawAll();
                break;
            case AcceptedControllerEvents.WME_SETTINGS_UPDATED:
                return this.emit(SVLEvents.WME_SETTINGS_CHANGED);
                break;
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

    public prompt(title: string, message: string, defaultValue: string = '', okFunction: (target: EventTarget | null, input: string) => void): void {
        if (!this.wazeWrap) {
            let res = prompt(message, defaultValue);
            if (res !== null) {
                okFunction(null, res);
            }
            return;
        }
        try {
            this.wazeWrap.Alerts.prompt(title, message, defaultValue, okFunction);
        } catch (e) {
            console.error(e);
            let res = prompt(message, defaultValue);
            if (res !== null) {
                okFunction(null, res);
            }
        }
    }

    public alertDebug(type: AlertType, message: string): void {
        if (__DEBUG__) {
            if (!this.wazeWrap) {
                console.error("SVL DEBUG ALERT:", message);
                return;
            }
            this.alert(type, message);
        }
    }

    private postponeAlert(type: AlertType, message: string, trial: number): void {
        setTimeout(() => {
            this.alert(type, message, trial);
        }, 1000);
    }

    public alert(type: AlertType, message: string, trial: number = 0): void {
        if (!this.wazeWrap) {
            if (trial < 10) {
                this.postponeAlert(type, message, trial + 1);
            } else {
                window.alert(message)
            }
            return;
        }
        try {
            this.wazeWrap.Alerts[type](GM_info.script.name, message + (__DEBUG__ && trial > 0 ? `&nbsp;(Trial #${trial})` : ''));
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