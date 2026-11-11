import RenderingController from "./Controllers/RenderingController";
import WMEEventsController, { SVLCallbackEventTypes } from "./Controllers/WMEEventsController";
import LayerStateController from "./Controllers/LayerStateController";
import PreferencesController from "./Controllers/PreferencesController";
import LocalizationController from "./Controllers/LocalizationController";
import { AsyncWmeSDK, DataModelName } from "wme-sdk-typings";
import AbstractMediator, { AlertType, SVLEvents } from "./Controllers/AbstractMediator";
import UserInterfaceController from "./Controllers/UserInterfaceController";
import { AcceptedControllerEvents, ChangedIDsInfo, DEFAULT_PREFERENCES, SVLLayerState } from "./svlGlobals";
import AlertController from "./Controllers/AlertController";

export default class SVLMediator extends AbstractMediator {
    // Singleton pattern
    private static instance: SVLMediator;
    readonly wmeSDK: AsyncWmeSDK;
    private renderingController!: RenderingController;
    private wmeEventsController!: WMEEventsController;
    private layerStateController!: LayerStateController;
    private preferencesController!: PreferencesController;
    private localizationController!: LocalizationController;
    private userInterfaceController!: UserInterfaceController;
    public readonly alertController: AlertController;

    private currentTopCountryId: number | null = null;
    public readonly SVL_VERSION: string = GM_info.script.version;

    private autoReloadInterval: number | null = null;
    private routingModeSuppressed: boolean = false;

    private constructor({ wmeSDK }: { wmeSDK: AsyncWmeSDK }) {
        super();
        this.alertController = new AlertController();
        this.wmeSDK = wmeSDK;
    }

    private async waitForInitialMapData(): Promise<void> {
        if (await this.wmeSDK.State.isInitialMapDataLoaded()) {
            return;
        }
        await this.wmeSDK.Events.once({ eventName: "wme-map-initial-data-loaded" });
    }

    public static async initialize({ wmeSDK }: { wmeSDK: AsyncWmeSDK }): Promise<SVLMediator> {
        if (!SVLMediator.instance) {
            const instance = new SVLMediator({ wmeSDK });
            SVLMediator.instance = instance;

            const [localizationController] = await Promise.all([
                LocalizationController.initialize({ mediator: instance }),
                instance.waitForInitialMapData(),
            ]);
            instance.localizationController = localizationController;
            instance.preferencesController = await PreferencesController.initialize({ mediator: instance });
            instance.layerStateController = await LayerStateController.initialize({ mediator: instance });
            instance.renderingController = await RenderingController.initialize({ mediator: instance });
            instance.wmeEventsController = await WMEEventsController.initialize({ mediator: instance });

            try {
                instance.userInterfaceController = await UserInterfaceController.initialize({
                    mediator: instance,
                    preferencesController: instance.preferencesController,
                });
            } catch (e) {
                console.error("Error initializing UserInterfaceController:", e);
                instance.alert(AlertType.ERROR, 'Error initializing SVL User Interface.');
            }

            instance.registerCallbacks();

            await instance.checkCountryChanged();
            await instance.layerStateController.enableLayerForTheFirstTime();

            instance.updateRefreshStatus();

            instance.emit(SVLEvents.INITIALIZED);
            return instance;
        } else {
            throw new Error("SVLMediator is already initialized.");
        }
    }

    private registerCallbacks(): void {
        this.wmeSDK.Events.on({
            eventName: "wme-logged-in",
            eventHandler: async () => {
                const userInfo = await this.wmeSDK.State.getUserInfo();
                this.preferencesController.updateUserRank(userInfo?.rank);
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.COUNTRY_CHANGE,
            sdkName: "wme-map-data-loaded",
            callback: async () => {
                await this.layerStateController.refreshMapMetrics();
                await this.checkCountryChanged();
            },
            deferInMs: 1000,
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.ZOOM,
            sdkName: "wme-map-zoom-changed",
            deferInMs: 500,
            callback: async () => {
                await this.layerStateController.refreshMapMetrics();
                await this.renderingController.zoomChanged();
                this.emit(SVLEvents.ZOOM_CHANGED);
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.WME_SETTINGS_CHANGED,
            sdkName: "wme-user-settings-changed",
            callback: () => {
                this.alertDebug(AlertType.INFO, "WME Settings Changed");
                this.notify(this, AcceptedControllerEvents.WME_SETTINGS_UPDATED);
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DRAWING_ABORTED,
            sdkName: "wme-map-data-loaded",
            callback: async () => {
                this.alertDebug(AlertType.INFO, "Drawing Aborted Callback");
                await this.renderingController.shouldDrawingResumeAfterAbort();
            },
            deferInMs: 500,
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-added",
            callback: async ({ dataModelName, objectIds }: { dataModelName: DataModelName; objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        await this.renderingController.addSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        await this.renderingController.addNodesByIds(objectIds as number[]);
                        break;
                    case "roadClosures":
                        await this.renderingController.refreshRoadClosureSegments(objectIds);
                        break;
                }
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-removed",
            callback: async ({ dataModelName, objectIds }: { dataModelName: DataModelName; objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        await this.renderingController.removeSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        await this.renderingController.removeNodesByIds(objectIds as number[]);
                        break;
                    case "roadClosures":
                        await this.renderingController.refreshRoadClosureSegments(objectIds);
                        break;
                }
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-changed",
            callback: async ({ dataModelName, objectIds }: { dataModelName: DataModelName; objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        await this.renderingController.updateSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        await this.renderingController.updateNodesByIds(objectIds as number[]);
                        break;
                    case "roadClosures":
                        await this.renderingController.refreshRoadClosureSegments(objectIds);
                        break;
                }
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-object-state-deleted",
            callback: async ({ dataModelName, objectIds }: { dataModelName: DataModelName; objectIds: Array<string | number> }) => {
                switch (dataModelName) {
                    case "segments":
                        await this.renderingController.removeSegmentsByIds(objectIds as number[]);
                        break;
                    case "nodes":
                        await this.renderingController.removeNodesByIds(objectIds as number[]);
                        break;
                    case "roadClosures":
                        await this.renderingController.refreshRoadClosureSegments(objectIds);
                        break;
                }
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-object-changed-id",
            callback: async ({ dataModelName, objectIds }: { dataModelName: DataModelName; objectIds: ChangedIDsInfo }) => {
                const { oldID, newID } = objectIds;
                if (oldID === null || newID === null) return;
                switch (dataModelName) {
                    case "segments":
                        await this.renderingController.handleSegmentIdChanged(Number(oldID), Number(newID));
                        break;
                    case "nodes":
                        await this.renderingController.handleNodeIdChanged(Number(oldID), Number(newID));
                        break;
                    case "roadClosures":
                        await this.renderingController.refreshRoadClosureSegments([newID]);
                        break;
                }
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.DATA_MODEL,
            sdkName: "wme-data-model-objects-saved",
            callback: ({ dataModelName }: { dataModelName: DataModelName; objectIds: Array<string | number> }) => {
                if (dataModelName === "segments") {
                    this.renderingController.redrawAll();
                }
            },
        });

        this.wmeEventsController.registerSVLCallback({
            eventType: SVLCallbackEventTypes.LAYER_VISIBILITY_CHANGED,
            sdkName: "wme-layer-visibility-changed",
            callback: async (e: { layerName: string }) => {
                if (e.layerName !== "roads") return;
                await this.layerStateController.hideWMERoadLayerIfNeeded();
            },
        });
    }

    private async checkCountryChanged(): Promise<void> {
        const topCountry = await this.wmeSDK.DataModel.Countries.getTopCountry();
        if (!topCountry || topCountry.id === this.currentTopCountryId) {
            return;
        }

        this.alertDebug(AlertType.SUCCESS, "Country changed to " + topCountry.name);
        this.currentTopCountryId = topCountry.id;

        this.emit(SVLEvents.COUNTRY_CHANGED, { newCountry: topCountry });
    }

    public debugLog(message: string, ...args: unknown[]): void {
        if (__DEBUG__) {
            console.debug(`[SVL DEBUG]: ${message}`, ...args);
        }
    }

    public getState(): SVLLayerState {
        return this.layerStateController?.getCurrentState() ?? SVLLayerState.UNINITIALIZED;
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

    public notify(sender: unknown, event: AcceptedControllerEvents): void {
        switch (event) {
            case AcceptedControllerEvents.SVL_SHOULD_AUTOMATICALLY_DISABLE:
                this.emit(SVLEvents.AUTOMATICALLY_DISABLED);
                break;
            case AcceptedControllerEvents.SVL_SHOULD_ENABLE_LAYER:
                void this.layerStateController.tryEnablingSVLRoadLayer();
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
            case AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED:
                this.emit(SVLEvents.DRAWING_ABORTED);
                break;
            case AcceptedControllerEvents.KEYBOARD_SHORTCUT_TRIGGERED:
                void this.layerStateController.toggleSVLLayerEnabledState();
                break;
            case AcceptedControllerEvents.PREFERENCES_SAVE_REQUEST:
                this.preferencesController.savePreferences();
                return;
            case AcceptedControllerEvents.PREFERENCES_ROLLBACK_REQUEST:
                this.preferencesController.rollbackPreferences();
                return;
            case AcceptedControllerEvents.PREFERENCES_RESET_REQUEST:
                this.preferencesController.resetPreferences();
                return;
            case AcceptedControllerEvents.PREFERENCES_IMPORT_REQUEST:
                this.preferencesController.importPreferences();
                return;
            case AcceptedControllerEvents.PREFERENCES_EXPORT_REQUEST:
                this.preferencesController.exportPreferences();
                return;
            case AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES:
            case AcceptedControllerEvents.PREFERENCES_UPDATED_REQUIRES_REDRAW:
                this.updateRefreshStatus();
                this.emit(SVLEvents.SVL_SETTINGS_CHANGED);
                return;
            case AcceptedControllerEvents.WME_SETTINGS_UPDATED:
                this.emit(SVLEvents.WME_SETTINGS_CHANGED);
                return;
            case AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH:
                void this.userInterfaceController?.updatePreferencesUI();
                return;
            case AcceptedControllerEvents.FIRST_RUN:
                this.handleFirstRun();
                return;
            default: {
                const senderName = (sender as { constructor?: { name?: string } } | null)?.constructor?.name ?? 'Unknown';
                console.warn(`Unhandled event type: ${event} from sender:`, sender);
                this.alert(AlertType.WARNING, `Unhandled event type: ${event} from sender: ${senderName}`);
                break;
            }
        }
    }

    public prompt(title: string, message: string, defaultValue: string = '', okFunction: (target: EventTarget | null, input: string) => void): void {
        this.alertController.prompt(title, message, defaultValue, (res) => {
            if (res !== null) {
                okFunction(null, res);
            }
        });
    }

    public alertDebug(type: AlertType, message: string): void {
        if (__DEBUG__) {
            this.alertController.debug(type, message);
            console.debug("SVL DEBUG ALERT:", message);
        }
    }

    public alert(type: AlertType, message: string, trial: number = 0): void {
        const fullMessage = message + (__DEBUG__ && trial > 0 ? ` (Trial #${trial})` : '');
        switch (type) {
            case AlertType.INFO:
                this.alertController.info(GM_info.script.name, fullMessage);
                break;
            case AlertType.SUCCESS:
                this.alertController.success(GM_info.script.name, fullMessage);
                break;
            case AlertType.WARNING:
                this.alertController.warning(GM_info.script.name, fullMessage);
                break;
            case AlertType.ERROR:
                this.alertController.error(GM_info.script.name, fullMessage);
                break;
            case AlertType.DEBUG:
                this.alertController.debug(GM_info.script.name, fullMessage);
                break;
            default:
                this.alertController.info(GM_info.script.name, fullMessage);
                break;
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

    public _(key: string, ...args: unknown[]): string {
        return this.localizationController.translate(key, ...args);
    }

    public getWmeSDK(): AsyncWmeSDK {
        return this.wmeSDK;
    }

    public static getInstance(): SVLMediator {
        if (!SVLMediator.instance) {
            throw new Error("SVLMediator is not initialized. Call SVLMediator.initialize() first.");
        }
        return SVLMediator.instance;
    }

    public isFarZoom(zoom = this.layerStateController.getCurrentZoomLevel()): boolean {
        return zoom < (this.getPreference('switchZoom') ?? DEFAULT_PREFERENCES.switchZoom);
    }

    private updateRefreshStatus(): void {
        if (this.autoReloadInterval !== null) {
            window.clearInterval(this.autoReloadInterval);
            this.autoReloadInterval = null;
        }

        const enabled = Boolean(this.getPreference('autoReload.enabled'));
        const interval = Number(this.getPreference('autoReload.interval')); // Value in ms

        if (enabled && interval >= 20000) {
            this.autoReloadInterval = window.setInterval(
                () => { void this.refreshWME(); },
                interval
            );
            this.alertDebug(AlertType.INFO, `Auto refresh enabled. Interval: ${interval / 1000}s`);
        }
    }

    private async refreshWME(): Promise<void> {
        try {
            const editing = this.wmeSDK.Editing;
            const [isMapLoading, unsavedChangesCount, selection, isDrawing] = await Promise.all([
                this.wmeSDK.State.isMapLoading(),
                editing.getUnsavedChangesCount(),
                editing.getSelection(),
                editing.isDrawingInProgress(),
            ]);
            const hasActivePanel = (document.querySelector('#panel-container')?.childElementCount ?? 0) > 0;

            if (
                !isMapLoading &&
                unsavedChangesCount === 0 &&
                !selection &&
                !isDrawing &&
                !hasActivePanel
            ) {
                this.alertDebug(AlertType.INFO, "Auto refreshing WME data...");
                await this.wmeSDK.DataModel.refreshData();
            }
        } catch (error) {
            this.debugLog("Auto refresh skipped (refresh currently unavailable):", error);
        }
    }

    public areOnlineTranslationsLoaded(): boolean {
        return this.localizationController.getOnlineTranslationsLoaded();
    }

    public setRoutingModeSuppressed(suppressed: boolean): void {
        this.routingModeSuppressed = suppressed;
    }

    public isRoutingModeActive(): boolean {
        return Boolean(this.getPreference('routingModeEnabled')) && !this.routingModeSuppressed;
    }
}
