import { DataModelName } from "wme-sdk-typings";
import SVLMediator from "../SVLMediator";
import AbstractController from "./AbstractController";
import { SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents } from "../svlGlobals";

export enum SVLCallbackEventTypes {
    DATA_MODEL, // Called when data model events occur (nodes, segments, etc.)
    ZOOM, // Called when zoom events occur
    COUNTRY_CHANGE, // Called when the country changes
    DRAWING_ABORTED, // Called when drawing is aborted
    WME_SETTINGS_CHANGED, // Called when WME settings are changed
}

type SdkDataModelEvents = "wme-data-model-objects-added" | "wme-data-model-objects-changed" | "wme-data-model-objects-removed" | "wme-data-model-object-state-deleted" | "wme-data-model-objects-saved";
type SdkEventsWithoutCallbacks = "wme-layer-checkbox-toggled" | "wme-map-zoom-changed" | "wme-map-data-loaded" | "wme-user-settings-changed";
type SdkEventName = (SdkEventsWithoutCallbacks | SdkDataModelEvents);

type EventExecution = {
    eventType: SVLCallbackEventTypes,
    sdkName: SdkEventName,
    callback: (() => void) | (({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void),
    deferInMs?: number,
}

type RegisteredEventExecution = {
    cleanUp: (() => void) | null,
    callback: () => void,
    timeoutId: number | undefined,
    deferInMs?: number,
}

type RegisteredDataModelExecution = {
    cleanUp: (() => void) | null,
    callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void,
    timeoutId: number | undefined,
    deferInMs?: number,
}


export default class WMEEventsController extends AbstractController {
    // Singleton pattern
    private static instance: WMEEventsController | null = null;
    private lastState: SVLEvents | null = null;
    private stateHandlers: Partial<{ [key in SVLEvents]: () => void }> = {
        [SVLEvents.LAYER_ENABLED]: this.handleLayerEnabled.bind(this),
        [SVLEvents.USER_DISABLED]: this.handleUserDisabled.bind(this),
        [SVLEvents.AUTOMATICALLY_DISABLED]: this.handleSvlAutomaticallyDisabled.bind(this),
        [SVLEvents.DRAWING_ABORTED]: this.handleSvlDrawingAborted.bind(this),
    };

    private registeredSVLCallbacks: Map<SVLCallbackEventTypes, Map<SdkEventsWithoutCallbacks,
        RegisteredEventExecution>> = new Map();
    private registeredSVLDataModelCallbacks: Map<SdkDataModelEvents,
        RegisteredDataModelExecution> = new Map();

    private constructor({ mediator }: { mediator: SVLMediator }) {
        // Private constructor to prevent direct instantiation
        super(mediator);
        for (let eventType in SVLEvents) {
            let callback = this.stateHandlers[SVLEvents[eventType as keyof typeof SVLEvents]];
            if (callback !== undefined) {
                this.mediator.subscribe(SVLEvents[eventType as keyof typeof SVLEvents], callback);
            }
        }
    }

    public registerSVLCallback({ eventType, sdkName, callback, deferInMs }: EventExecution): void {
        if (eventType === SVLCallbackEventTypes.DATA_MODEL) {
            this.registerDataModelCallback(sdkName as SdkDataModelEvents,
                callback as (({ dataModelName, objectIds }:
                    { dataModelName: DataModelName, objectIds: Array<string | number> }) => void),
                deferInMs);
            return;
        }

        if (!this.registeredSVLCallbacks.has(eventType)) {
            this.registeredSVLCallbacks.set(eventType, new Map());
        }
        const callbacks = this.registeredSVLCallbacks.get(eventType);
        if (callbacks) {
            if (!callbacks.has(sdkName as SdkEventsWithoutCallbacks)) {
                callbacks.set(sdkName as SdkEventsWithoutCallbacks, {
                    callback: callback as () => void,
                    cleanUp: null,
                    deferInMs: deferInMs,
                    timeoutId: undefined
                });
            } else {
                alert("This event was already set!");
                debugger;
            }
        }
    }

    private registerDataModelCallback(sdkName: SdkDataModelEvents, callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void, deferInMs?: number): void {
        if (!this.registeredSVLDataModelCallbacks.has(sdkName)) {
            this.registeredSVLDataModelCallbacks.set(sdkName, {
                callback: callback,
                cleanUp: null,
                deferInMs: deferInMs,
                timeoutId: undefined
            });
        }
    }

    private unregisterDataModelCallback(sdkName: SdkDataModelEvents, callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void): void {
        const callbacks = this.registeredSVLDataModelCallbacks.get(sdkName);
        if (callbacks && callbacks.callback === callback) {
            if (callbacks.timeoutId) {
                clearTimeout(callbacks.timeoutId);
                callbacks.timeoutId = undefined;
            }
            callbacks.cleanUp?.();
            this.registeredSVLDataModelCallbacks.delete(sdkName);
        }
    }

    public unregisterCallback(eventType: SVLCallbackEventTypes, sdkName: SdkEventName, callback: (() => void) | (({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void)): void {
        if (eventType === SVLCallbackEventTypes.DATA_MODEL) {
            this.unregisterDataModelCallback(sdkName as SdkDataModelEvents, callback as ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void);
            return;
        }
        const callbacks = this.registeredSVLCallbacks.get(eventType);
        if (callbacks) {
            const registeredCallback = callbacks.get(sdkName as SdkEventsWithoutCallbacks);
            if (registeredCallback && registeredCallback.callback === callback) {
                if (registeredCallback.timeoutId) {
                    clearTimeout(registeredCallback.timeoutId);
                    registeredCallback.timeoutId = undefined;
                }
                registeredCallback.cleanUp?.();
                callbacks.delete(sdkName as SdkEventsWithoutCallbacks);
            }
        }
    }

    public static getInstance(): WMEEventsController {
        if (!WMEEventsController.instance) {
            throw new Error("WMEEventsController not initialized. Call initialize() first.");
        }
        return WMEEventsController.instance;
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<WMEEventsController> {
        if (!WMEEventsController.instance) {
            WMEEventsController.instance = new WMEEventsController({ mediator });
            return WMEEventsController.instance;
        } else {
            throw new Error("WMEEventsController is already initialized.");
        }

    }

    public handleLayerEnabled() {
        console.debug('WMEEventsController: Handling layer enabled event');
        debugger;
        this.disableDrawingAbortedEvents();

        this.enableZoomEvents();
        this.enableCountryChangeEvent();
        this.enableAllDataModelEvents();
        this.enableWmeSettingsChangedEvents();
        this.startTrackingNodesEvents();
        this.startTrackingSegmentsEvents();
        this.lastState = SVLEvents.LAYER_ENABLED;
    }

    public handleWmeSettingsChanged() {
        console.debug('WMEEventsController: Handling WME settings changed event');
        this.mediator.notify(this, AcceptedControllerEvents.WME_SETTINGS_UPDATED);
        // This is not a state change, so we don't update lastState
    }

    public handleSvlAutomaticallyDisabled() {
        this.disableCountryChangeEvent();
        this.disableWmeSettingsChangedEvents();
        this.stopTrackingSegmentsEvents();
        this.stopTrackingNodesEvents();
        this.lastState = SVLEvents.AUTOMATICALLY_DISABLED;
    }

    public handleUserDisabled() {
        console.debug('WMEEventsController: Handling user disabled event');
        this.stopTrackingNodesEvents();
        this.stopTrackingSegmentsEvents();
        this.disableZoomEvents();
        this.disableCountryChangeEvent();
        this.disableDataModelEvents();
        this.disableWmeSettingsChangedEvents();
        this.lastState = SVLEvents.USER_DISABLED;
    }

    public handleSvlDrawingAborted() {
        console.debug('WMEEventsController: Handling drawing aborted event');
        this.stopTrackingNodesEvents();
        this.stopTrackingSegmentsEvents();
        this.disableZoomEvents();
        this.disableCountryChangeEvent();
        this.disableDataModelEvents();
        this.disableWmeSettingsChangedEvents();

        this.enableDrawingAbortedEvents();
        this.lastState = SVLEvents.DRAWING_ABORTED;
    }

    public refreshState() {
        const handler = this.lastState && this.stateHandlers[this.lastState];
        if (handler) {
            handler();
        }
    }

    private enableSDKEvents({ type, sdkEvent }:
        { type: SVLCallbackEventTypes, sdkEvent: SdkEventName }): void {
        if (type === SVLCallbackEventTypes.DATA_MODEL) {
            this.enableDataModelEventsOfSdkType({ sdkEvent: sdkEvent as SdkDataModelEvents });
            return;
        }
        const callbacks = this.registeredSVLCallbacks.get(type);
        if (!callbacks) {
            return;
        }
        const eventCallbacks = callbacks.get(sdkEvent as SdkEventsWithoutCallbacks);
        if (!eventCallbacks) {
            return;
        }
        if (eventCallbacks.cleanUp) {
            // Already registered
            return;
        }
        console.debug(`WMEEventsController: Enabling event ${sdkEvent}`);
        if (!eventCallbacks.deferInMs || eventCallbacks.deferInMs <= 0) {
            eventCallbacks.cleanUp = this.mediator.wmeSDK.Events.on({
                eventName: sdkEvent as SdkEventsWithoutCallbacks,
                eventHandler: eventCallbacks.callback,
            });
        } else {
            eventCallbacks.cleanUp = this.mediator.wmeSDK.Events.on({
                eventName: sdkEvent as SdkEventsWithoutCallbacks,
                eventHandler: () => {
                    this.deferExecution(eventCallbacks);
                },
            });
        }
    }

    private deferExecution(exec: any): void {
        if (exec.timeoutId) {
            clearTimeout(exec.timeoutId);
        }
        exec.timeoutId = window.setTimeout(() => {
            exec.callback();
            exec.timeoutId = undefined;
        }, exec.deferInMs);
    }

    private enableAllDataModelEvents(): void {
        this.registeredSVLDataModelCallbacks.forEach((value, key) => {
            this.enableDataModelEventsOfSdkType({ sdkEvent: key });
        });
    }

    private enableDataModelEventsOfSdkType({ sdkEvent }:
        { sdkEvent: SdkDataModelEvents }): void {
        const callbacks = this.registeredSVLDataModelCallbacks.get(sdkEvent);
        if (!callbacks) {
            return;
        }
        if (callbacks.cleanUp) {
            // Already registered
            return;
        }
        console.debug(`WMEEventsController: Enabling data model event ${sdkEvent}`);
        if (!callbacks.deferInMs || callbacks.deferInMs <= 0) {
            callbacks.cleanUp = this.mediator.wmeSDK.Events.on({
                eventName: sdkEvent,
                eventHandler: callbacks.callback,
            });
        } else {
            callbacks.cleanUp = this.mediator.wmeSDK.Events.on({
                eventName: sdkEvent,
                eventHandler: () => {
                    this.deferExecution(callbacks);
                }
            });
        }
    }

    private disableDataModelEvents() {
        this.registeredSVLDataModelCallbacks.forEach((value, key) => {
            value.cleanUp?.();
            value.cleanUp = null;
        });
    }

    private enableZoomEvents() {
        this.enableAllEventsOfType(SVLCallbackEventTypes.ZOOM);
    }

    private disableZoomEvents() {
        this.disableAllCallbacksOfType(SVLCallbackEventTypes.ZOOM);
    }

    private enableCountryChangeEvent() {
        this.enableAllEventsOfType(SVLCallbackEventTypes.COUNTRY_CHANGE);
    }

    private disableCountryChangeEvent() {
        this.disableAllCallbacksOfType(SVLCallbackEventTypes.COUNTRY_CHANGE);
    }

    private removeCallbacks(callbacks: Array<() => void>): void {
        while (callbacks.length > 0) {
            let callback = callbacks.pop();
            if (callback) {
                callback();
            }
        }
    }

    private disableAllCallbacksOfType(eventType: SVLCallbackEventTypes): void {
        if (eventType === SVLCallbackEventTypes.DATA_MODEL) {
            this.disableDataModelEvents();
            return;
        }
        let callbacks = this.registeredSVLCallbacks.get(eventType);
        if (!callbacks) {
            return;
        }

        let wmeEvents = callbacks.keys();
        for (let wmeEvent of wmeEvents) {
            let callback = callbacks.get(wmeEvent);
            if (callback) {
                callback.cleanUp?.();
                callback.cleanUp = null;
            }
        }
    }

    private startTrackingSegmentsEvents(): void {
        console.debug('Registering segment events');
        this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "segments" });
    }

    private stopTrackingSegmentsEvents(): void {
        console.debug('Removing segments events');
        this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "segments" });
    }

    private startTrackingNodesEvents(): void {
        console.debug('Registering node events');
        this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "nodes" });
    }

    private stopTrackingNodesEvents(): void {
        console.debug('Removing node events');
        this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "nodes" });
    }

    private enableAllEventsOfType(eventType: SVLCallbackEventTypes): void {
        let callbacks = this.registeredSVLCallbacks.get(eventType);
        if (!callbacks) {
            return;
        }
        let wmeEvents = <MapIterator<SdkEventName>>callbacks.keys();
        for (let wmeEvent of wmeEvents) {
            this.enableSDKEvents({ type: eventType, sdkEvent: wmeEvent });
        }
    }

    private enableDrawingAbortedEvents(): void {
        this.enableAllEventsOfType(SVLCallbackEventTypes.DRAWING_ABORTED);
    }

    private disableDrawingAbortedEvents(): void {
        this.disableAllCallbacksOfType(SVLCallbackEventTypes.DRAWING_ABORTED);
    }

    private enableWmeSettingsChangedEvents(): void {
        this.enableAllEventsOfType(SVLCallbackEventTypes.WME_SETTINGS_CHANGED);
    }

    private disableWmeSettingsChangedEvents(): void {
        this.disableAllCallbacksOfType(SVLCallbackEventTypes.WME_SETTINGS_CHANGED);
    }
}