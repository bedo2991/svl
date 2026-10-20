import { DataModelName } from "wme-sdk-typings";
import SVLMediator from "../SVLMediator";
import AbstractController from "./AbstractController";
import { AlertType, SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents } from "../svlGlobals";

export enum SVLCallbackEventTypes {
    DATA_MODEL, // Called when data model events occur (nodes, segments, etc.)
    ZOOM, // Called when zoom events occur
    COUNTRY_CHANGE, // Called when the country changes
    DRAWING_ABORTED, // Called when drawing is aborted
    WME_SETTINGS_CHANGED, // Called when WME settings are changed
    LAYER_VISIBILITY_CHANGED, // Called when layer visibility changes
}

type SdkDataModelEvents = "wme-data-model-objects-added" | "wme-data-model-objects-changed" | "wme-data-model-objects-removed" | "wme-data-model-object-state-deleted" | "wme-data-model-objects-saved";
type SdkEventsWithoutCallbacks = "wme-layer-checkbox-toggled" | "wme-map-zoom-changed" | "wme-map-data-loaded" | "wme-user-settings-changed";
type SdkEventWithStringParameter = "wme-layer-visibility-changed";
type SdkEventName = (SdkEventsWithoutCallbacks | SdkDataModelEvents | SdkEventWithStringParameter);

type EventExecution = {
    eventType: SVLCallbackEventTypes,
    sdkName: SdkEventName,
    callback: RegisteredEventExecution["callback"] | RegisteredDataModelExecution["callback"] | RegisteredLayerVisibilityExecution["callback"],
    deferInMs?: number,
}

type RegisteredEventExecution = {
    cleanUp: (() => void) | null,
    callback: () => void | Promise<void>,
    timeoutId: number | undefined,
    deferInMs?: number,
}

type RegisteredDataModelExecution = {
    cleanUp: (() => void) | null,
    callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName, objectIds: Array<string | number> }) => void | Promise<void>,
    timeoutId: number | undefined,
    deferInMs?: number,
    pendingObjectIdsByModel: Map<DataModelName, Set<string | number>>,
}

type RegisteredLayerVisibilityExecution = {
    cleanUp: (() => void) | null,
    callback: ({ layerName }: { layerName: string }) => void | Promise<void>,
    timeoutId: number | undefined,
    deferInMs?: number,
}

/**
 * This class manages WME events that should be active based on the SVL state.
 * It enables or disables event listeners according to whether SVL is enabled,
 * disabled by the user, or automatically disabled.
 */
export default class WMEEventsController extends AbstractController {
    // Singleton pattern
    private static instance: WMEEventsController | null = null;
    private lastState: SVLEvents | null = null;
    private stateHandlers: Partial<{ [key in SVLEvents]: () => void | Promise<void> }> = {
        [SVLEvents.LAYER_ENABLED]: this.handleLayerEnabled.bind(this),
        [SVLEvents.USER_DISABLED]: this.handleUserDisabled.bind(this),
        [SVLEvents.AUTOMATICALLY_DISABLED]: this.handleSvlAutomaticallyDisabled.bind(this),
        [SVLEvents.DRAWING_ABORTED]: this.handleSvlDrawingAborted.bind(this),
    };

    private registeredSVLCallbacks: Map<SVLCallbackEventTypes, Map<SdkEventsWithoutCallbacks,
        RegisteredEventExecution>> = new Map();
    private registeredSVLDataModelCallbacks: Map<SdkDataModelEvents,
        RegisteredDataModelExecution> = new Map();
    private registeredSVLLayerVisibilityCallbacks: Map<SdkEventWithStringParameter,
        RegisteredLayerVisibilityExecution> = new Map();

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
                callback as RegisteredDataModelExecution["callback"],
                deferInMs);
            return;
        }

        if (eventType === SVLCallbackEventTypes.LAYER_VISIBILITY_CHANGED) {
            this.registerLayerVisibilityCallback(sdkName as SdkEventWithStringParameter,
                callback as RegisteredLayerVisibilityExecution["callback"],
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
                console.warn(`SVL: Event ${sdkName} was already registered for type ${eventType}`);
            }
        }
    }

    private registerDataModelCallback(sdkName: SdkDataModelEvents, callback: RegisteredDataModelExecution["callback"], deferInMs?: number): void {
        if (!this.registeredSVLDataModelCallbacks.has(sdkName)) {
            this.registeredSVLDataModelCallbacks.set(sdkName, {
                callback: callback,
                cleanUp: null,
                deferInMs: deferInMs,
                timeoutId: undefined,
                pendingObjectIdsByModel: new Map(),
            });
        } else {
            console.warn(`SVL: Data model event ${sdkName} was already registered`);
        }
    }

    private registerLayerVisibilityCallback(sdkName: SdkEventWithStringParameter, callback: RegisteredLayerVisibilityExecution["callback"], deferInMs?: number): void {
        if (!this.registeredSVLLayerVisibilityCallbacks.has(sdkName)) {
            this.registeredSVLLayerVisibilityCallbacks.set(sdkName, {
                callback: callback,
                cleanUp: null,
                deferInMs: deferInMs,
                timeoutId: undefined
            });
        } else {
            console.warn(`SVL: Layer visibility event ${sdkName} was already registered`);
        }
    }

    private unregisterDataModelCallback(sdkName: SdkDataModelEvents, callback: RegisteredDataModelExecution["callback"]): void {
        const callbacks = this.registeredSVLDataModelCallbacks.get(sdkName);
        if (callbacks && callbacks.callback === callback) {
            if (callbacks.timeoutId) {
                clearTimeout(callbacks.timeoutId);
                callbacks.timeoutId = undefined;
            }
            callbacks.pendingObjectIdsByModel.clear();
            callbacks.cleanUp?.();
            this.registeredSVLDataModelCallbacks.delete(sdkName);
        }
    }

    private unregisterLayerVisibilityCallback(sdkName: SdkEventWithStringParameter, callback: RegisteredLayerVisibilityExecution["callback"]): void {
        const callbacks = this.registeredSVLLayerVisibilityCallbacks.get(sdkName);
        if (callbacks && callbacks.callback === callback) {
            if (callbacks.timeoutId) {
                clearTimeout(callbacks.timeoutId);
                callbacks.timeoutId = undefined;
            }
            callbacks.cleanUp?.();
            this.registeredSVLLayerVisibilityCallbacks.delete(sdkName);
        }
    }


    public unregisterCallback(eventType: SVLCallbackEventTypes, sdkName: SdkEventName, callback: RegisteredEventExecution["callback"] | RegisteredDataModelExecution["callback"] | RegisteredLayerVisibilityExecution["callback"]): void {
        if (eventType === SVLCallbackEventTypes.DATA_MODEL) {
            this.unregisterDataModelCallback(sdkName as SdkDataModelEvents, callback as RegisteredDataModelExecution["callback"]);
            return;
        }

        if (eventType === SVLCallbackEventTypes.LAYER_VISIBILITY_CHANGED) {
            this.unregisterLayerVisibilityCallback(sdkName as SdkEventWithStringParameter, callback as RegisteredLayerVisibilityExecution["callback"]);
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

    private async manageState({ zoomEvents, countryChangeEvents, dataModelEvents, wmeSettingsChangedEvents, nodeTrackingEvents, segmentTrackingEvents, drawingAbortedEvents, layerVisibilityChangedEvents }: {
        zoomEvents: boolean,
        countryChangeEvents: boolean,
        dataModelEvents: boolean,
        wmeSettingsChangedEvents: boolean,
        nodeTrackingEvents: boolean,
        segmentTrackingEvents: boolean,
        drawingAbortedEvents: boolean,
        layerVisibilityChangedEvents: boolean,
    }): Promise<void> {
        if (zoomEvents) {
            this.enableZoomEvents();
        } else {
            this.disableZoomEvents();
        }

        if (countryChangeEvents) {
            this.enableCountryChangeEvent();
        } else {
            this.disableCountryChangeEvent();
        }

        if (dataModelEvents) {
            this.enableAllDataModelEvents();
        } else {
            this.disableDataModelEvents();
        }

        if (wmeSettingsChangedEvents) {
            this.enableWmeSettingsChangedEvents();
        } else {
            this.disableWmeSettingsChangedEvents();
        }

        if (nodeTrackingEvents) {
            await this.startTrackingNodesEvents();
        } else {
            await this.stopTrackingNodesEvents();
        }

        if (segmentTrackingEvents) {
            await this.startTrackingSegmentsEvents();
        } else {
            await this.stopTrackingSegmentsEvents();
        }

        if (drawingAbortedEvents) {
            this.enableDrawingAbortedEvents();
        } else {
            this.disableDrawingAbortedEvents();
        }

        if (layerVisibilityChangedEvents) {
            await this.startTrackingRoadLayerEvents();
            this.enableLayerVisibilityChangedEvents();
        } else {
            await this.stopTrackingRoadLayerEvents();
            this.disableLayerVisibilityChangedEvents();
        }
    }

    public async handleLayerEnabled(): Promise<void> {
        console.debug('WMEEventsController: Handling layer enabled event');
        this.lastState = SVLEvents.LAYER_ENABLED;
        await this.manageState({
            zoomEvents: true,
            countryChangeEvents: true,
            dataModelEvents: true,
            wmeSettingsChangedEvents: true,
            nodeTrackingEvents: true,
            segmentTrackingEvents: true,
            drawingAbortedEvents: false,
            layerVisibilityChangedEvents: true,
        });
    }

    public handleWmeSettingsChanged() {
        console.debug('WMEEventsController: Handling WME settings changed event');
        this.mediator.notify(this, AcceptedControllerEvents.WME_SETTINGS_UPDATED);
        // This is not a state change, so we don't update lastState
    }

    public async handleSvlAutomaticallyDisabled(): Promise<void> {
        this.lastState = SVLEvents.AUTOMATICALLY_DISABLED;
        await this.manageState({
            zoomEvents: true,
            countryChangeEvents: false,
            dataModelEvents: false,
            wmeSettingsChangedEvents: false,
            nodeTrackingEvents: false,
            segmentTrackingEvents: false,
            drawingAbortedEvents: false,
            layerVisibilityChangedEvents: false,
        });
    }

    public async handleUserDisabled(): Promise<void> {
        console.debug('WMEEventsController: Handling user disabled event');
        this.lastState = SVLEvents.USER_DISABLED;
        await this.manageState({
            zoomEvents: false,
            countryChangeEvents: false,
            dataModelEvents: false,
            wmeSettingsChangedEvents: false,
            nodeTrackingEvents: false,
            segmentTrackingEvents: false,
            drawingAbortedEvents: false,
            layerVisibilityChangedEvents: false,
        });
    }

    public async handleSvlDrawingAborted(): Promise<void> {
        console.debug('WMEEventsController: Handling drawing aborted event');

        this.lastState = SVLEvents.DRAWING_ABORTED;
        await this.manageState({
            zoomEvents: true,
            countryChangeEvents: true,
            dataModelEvents: false,
            wmeSettingsChangedEvents: true,
            nodeTrackingEvents: false,
            segmentTrackingEvents: false,
            drawingAbortedEvents: true,
            layerVisibilityChangedEvents: false,
        });
    }

    public async refreshState(): Promise<void> {
        const handler = this.lastState && this.stateHandlers[this.lastState];
        if (handler) {
            await handler();
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

    private deferExecution<TArgs extends unknown[]>(
        exec: { timeoutId: number | undefined; deferInMs?: number; callback: (...args: TArgs) => void | Promise<void> },
        ...args: TArgs
    ): void {
        if (exec.timeoutId) {
            clearTimeout(exec.timeoutId);
        }
        exec.timeoutId = window.setTimeout(() => {
            exec.timeoutId = undefined;
            exec.callback(...args);
        }, exec.deferInMs);
    }

    private deferDataModelExecution(
        exec: RegisteredDataModelExecution,
        event: { dataModelName: DataModelName; objectIds: Array<string | number> }
    ): void {
        let ids = exec.pendingObjectIdsByModel.get(event.dataModelName);
        if (!ids) {
            ids = new Set();
            exec.pendingObjectIdsByModel.set(event.dataModelName, ids);
        }
        for (const id of event.objectIds) {
            ids.add(id);
        }
        if (exec.timeoutId) {
            clearTimeout(exec.timeoutId);
        }
        exec.timeoutId = window.setTimeout(() => {
            exec.timeoutId = undefined;
            const pendingEntries = Array.from(exec.pendingObjectIdsByModel.entries());
            exec.pendingObjectIdsByModel.clear();
            for (const [dataModelName, objectIds] of pendingEntries) {
                exec.callback({ dataModelName, objectIds: Array.from(objectIds) });
            }
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
                eventHandler: (e: { dataModelName: DataModelName; objectIds: Array<string | number> }) => {
                    this.deferDataModelExecution(callbacks, e);
                }
            });
        }
    }

    private disableDataModelEvents() {
        this.registeredSVLDataModelCallbacks.forEach((value, key) => {
            if (value.timeoutId) {
                clearTimeout(value.timeoutId);
                value.timeoutId = undefined;
            }
            value.pendingObjectIdsByModel.clear();
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

    private enableLayerVisibilityChangedEvents(): void {
        this.enableAllLayerVisibilityChangedEvents();
    }

    private disableLayerVisibilityChangedEvents(): void {
        this.disableAllLayerVisibilityChangedEvents();
    }

    private enableAllLayerVisibilityChangedEvents(): void {
        this.registeredSVLLayerVisibilityCallbacks.forEach((value, key) => {
            this.enableLayerVisibilityChangedEventsOfSdkType({ sdkEvent: key });
        });
    }

    private enableLayerVisibilityChangedEventsOfSdkType({ sdkEvent }:
        { sdkEvent: SdkEventWithStringParameter }): void {
        const callbacks = this.registeredSVLLayerVisibilityCallbacks.get(sdkEvent);
        if (!callbacks) {
            return;
        }
        if (callbacks.cleanUp) {
            // Already registered
            return;
        }
        console.debug(`WMEEventsController: Enabling layer visibility changed event ${sdkEvent}`);
        if (!callbacks.deferInMs || callbacks.deferInMs <= 0) {
            callbacks.cleanUp = this.mediator.wmeSDK.Events.on({
                eventName: sdkEvent,
                eventHandler: callbacks.callback,
            });
        } else {
            callbacks.cleanUp = this.mediator.wmeSDK.Events.on({
                eventName: sdkEvent,
                eventHandler: (e: { layerName: string }) => {
                    this.deferExecution(callbacks, e);
                },
            });
        }
    }

    private disableAllLayerVisibilityChangedEvents(): void {
        this.registeredSVLLayerVisibilityCallbacks.forEach((value, key) => {
            if (value.timeoutId) {
                clearTimeout(value.timeoutId);
                value.timeoutId = undefined;
            }
            value.cleanUp?.();
            value.cleanUp = null;
        });
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

        if (eventType === SVLCallbackEventTypes.LAYER_VISIBILITY_CHANGED) {
            this.disableAllLayerVisibilityChangedEvents();
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
                if (callback.timeoutId) {
                    clearTimeout(callback.timeoutId);
                    callback.timeoutId = undefined;
                }
                callback.cleanUp?.();
                callback.cleanUp = null;
            }
        }
    }

    private async startTrackingRoadLayerEvents(): Promise<void> {
        await this.mediator.wmeSDK.Events.trackLayerEvents({
            layerName: "roads"
        });
    }

    private async stopTrackingRoadLayerEvents(): Promise<void> {
        await this.mediator.wmeSDK.Events.stopLayerEventsTracking({
            layerName: "roads"
        });
    }

    private async startTrackingSegmentsEvents(): Promise<void> {
        console.debug('Registering segment events');
        await this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "segments" });
    }

    private async stopTrackingSegmentsEvents(): Promise<void> {
        console.debug('Removing segments events');
        await this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "segments" });
    }

    private async startTrackingNodesEvents(): Promise<void> {
        console.debug('Registering node events');
        await this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "nodes" });
    }

    private async stopTrackingNodesEvents(): Promise<void> {
        console.debug('Removing node events');
        await this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "nodes" });
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