import { DataModelName } from "wme-sdk-typings";
import SVLMediator from "../SVLMediator";
import { ChangedIDsInfo } from "../svlGlobals";
import AbstractController from "./AbstractController";
import { SVLEvents } from "./AbstractMediator";

export enum SVLCallbackEventTypes {
    DATA_MODEL, // Called when data model events occur (nodes, segments, roadClosures, etc.)
    ZOOM, // Called when zoom events occur
    COUNTRY_CHANGE, // Called when the country changes
    DRAWING_ABORTED, // Called when drawing is aborted
    WME_SETTINGS_CHANGED, // Called when WME settings are changed
    LAYER_VISIBILITY_CHANGED, // Called when layer visibility changes
}

const DATA_MODEL_ARRAY_EVENTS = [
    "wme-data-model-objects-added",
    "wme-data-model-objects-changed",
    "wme-data-model-objects-removed",
    "wme-data-model-object-state-deleted",
    "wme-data-model-objects-saved",
] as const;

type SdkDataModelArrayEvents = (typeof DATA_MODEL_ARRAY_EVENTS)[number];

function isDataModelArrayEvent(event: SdkEventName): event is SdkDataModelArrayEvents {
    return (DATA_MODEL_ARRAY_EVENTS as readonly string[]).includes(event);
}

type SdkDataModelChangedIdEvent = "wme-data-model-object-changed-id";
type SdkDataModelEvents = SdkDataModelArrayEvents | SdkDataModelChangedIdEvent;
type SdkEventsWithoutCallbacks = "wme-layer-checkbox-toggled" | "wme-map-zoom-changed" | "wme-map-data-loaded" | "wme-user-settings-changed";
type SdkEventWithStringParameter = "wme-layer-visibility-changed";
type SdkEventName = SdkEventsWithoutCallbacks | SdkDataModelEvents | SdkEventWithStringParameter;

type DataModelIdChangedPayload = {
    dataModelName: DataModelName;
    objectIds: ChangedIDsInfo;
};

type EventExecution = {
    eventType: SVLCallbackEventTypes;
    sdkName: SdkEventName;
    callback:
        | RegisteredEventExecution["callback"]
        | RegisteredDataModelExecution["callback"]
        | RegisteredDataModelChangedIdExecution["callback"]
        | RegisteredLayerVisibilityExecution["callback"];
    deferInMs?: number;
};

type RegisteredEventExecution = {
    cleanUp: (() => void) | null;
    callback: () => void | Promise<void>;
    timeoutId: number | undefined;
    deferInMs?: number;
};

type RegisteredDataModelExecution = {
    cleanUp: (() => void) | null;
    callback: ({ dataModelName, objectIds }: { dataModelName: DataModelName; objectIds: Array<string | number> }) => void | Promise<void>;
    timeoutId: number | undefined;
    deferInMs?: number;
    pendingObjectIdsByModel: Map<DataModelName, Set<string | number>>;
};

type RegisteredDataModelChangedIdExecution = {
    cleanUp: (() => void) | null;
    callback: (payload: DataModelIdChangedPayload) => void | Promise<void>;
};

type RegisteredLayerVisibilityExecution = {
    cleanUp: (() => void) | null;
    callback: ({ layerName }: { layerName: string }) => void | Promise<void>;
    timeoutId: number | undefined;
    deferInMs?: number;
};

type ManagedStateConfig = {
    zoomEvents: boolean;
    countryChangeEvents: boolean;
    dataModelEvents: boolean;
    wmeSettingsChangedEvents: boolean;
    nodeTrackingEvents: boolean;
    segmentTrackingEvents: boolean;
    roadClosureTrackingEvents: boolean;
    drawingAbortedEvents: boolean;
    layerVisibilityChangedEvents: boolean;
};

/**
 * This class manages WME events that should be active based on the SVL state.
 * It enables or disables event listeners according to whether SVL is enabled,
 * disabled by the user, or automatically disabled.
 */
export default class WMEEventsController extends AbstractController {
    // Singleton pattern
    private static instance: WMEEventsController | null = null;
    private lastState: SVLEvents | null = null;
    private stateTransitionChain: Promise<void> = Promise.resolve();
    private isTrackingNodes: boolean = false;
    private isTrackingSegments: boolean = false;
    private isTrackingRoadClosures: boolean = false;
    private isTrackingRoadLayer: boolean = false;

    private stateHandlers: Partial<{ [key in SVLEvents]: () => void | Promise<void> }> = {
        [SVLEvents.LAYER_ENABLED]: this.handleLayerEnabled.bind(this),
        [SVLEvents.USER_DISABLED]: this.handleUserDisabled.bind(this),
        [SVLEvents.AUTOMATICALLY_DISABLED]: this.handleSvlAutomaticallyDisabled.bind(this),
        [SVLEvents.DRAWING_ABORTED]: this.handleSvlDrawingAborted.bind(this),
    };

    private registeredSVLCallbacks: Map<SVLCallbackEventTypes, Map<SdkEventsWithoutCallbacks, RegisteredEventExecution>> = new Map();
    private registeredSVLDataModelCallbacks: Map<SdkDataModelArrayEvents, RegisteredDataModelExecution> = new Map();
    private registeredSVLDataModelChangedIdCallback: RegisteredDataModelChangedIdExecution | null = null;
    private registeredSVLLayerVisibilityCallbacks: Map<SdkEventWithStringParameter, RegisteredLayerVisibilityExecution> = new Map();

    private constructor({ mediator }: { mediator: SVLMediator }) {
        super(mediator);
        for (const eventKey in SVLEvents) {
            const event = SVLEvents[eventKey as keyof typeof SVLEvents];
            const callback = this.stateHandlers[event];
            if (callback !== undefined) {
                this.mediator.subscribe(event, callback);
            }
        }
    }

    public registerSVLCallback({ eventType, sdkName, callback, deferInMs }: EventExecution): void {
        if (eventType === SVLCallbackEventTypes.DATA_MODEL) {
            if (sdkName === "wme-data-model-object-changed-id") {
                if (!this.registeredSVLDataModelChangedIdCallback) {
                    this.registeredSVLDataModelChangedIdCallback = {
                        callback: callback as RegisteredDataModelChangedIdExecution["callback"],
                        cleanUp: null,
                    };
                } else {
                    console.warn(`SVL: Data model event ${sdkName} was already registered`);
                }
                return;
            }
            this.registerDataModelCallback(
                sdkName as SdkDataModelArrayEvents,
                callback as RegisteredDataModelExecution["callback"],
                deferInMs
            );
            return;
        }

        if (eventType === SVLCallbackEventTypes.LAYER_VISIBILITY_CHANGED) {
            this.registerLayerVisibilityCallback(
                sdkName as SdkEventWithStringParameter,
                callback as RegisteredLayerVisibilityExecution["callback"],
                deferInMs
            );
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
                    deferInMs,
                    timeoutId: undefined,
                });
            } else {
                console.warn(`SVL: Event ${sdkName} was already registered for type ${eventType}`);
            }
        }
    }

    private registerDataModelCallback(
        sdkName: SdkDataModelArrayEvents,
        callback: RegisteredDataModelExecution["callback"],
        deferInMs?: number
    ): void {
        if (!this.registeredSVLDataModelCallbacks.has(sdkName)) {
            this.registeredSVLDataModelCallbacks.set(sdkName, {
                callback,
                cleanUp: null,
                deferInMs,
                timeoutId: undefined,
                pendingObjectIdsByModel: new Map(),
            });
        } else {
            console.warn(`SVL: Data model event ${sdkName} was already registered`);
        }
    }

    private registerLayerVisibilityCallback(
        sdkName: SdkEventWithStringParameter,
        callback: RegisteredLayerVisibilityExecution["callback"],
        deferInMs?: number
    ): void {
        if (!this.registeredSVLLayerVisibilityCallbacks.has(sdkName)) {
            this.registeredSVLLayerVisibilityCallbacks.set(sdkName, {
                callback,
                cleanUp: null,
                deferInMs,
                timeoutId: undefined,
            });
        } else {
            console.warn(`SVL: Layer visibility event ${sdkName} was already registered`);
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

    private enqueueStateTransition(config: ManagedStateConfig): Promise<void> {
        this.stateTransitionChain = this.stateTransitionChain
            .then(() => this.applyState(config))
            .catch((error) => {
                console.error("SVL: Error applying WME event state transition:", error);
            });
        return this.stateTransitionChain;
    }

    private async applyState({
        zoomEvents,
        countryChangeEvents,
        dataModelEvents,
        wmeSettingsChangedEvents,
        nodeTrackingEvents,
        segmentTrackingEvents,
        roadClosureTrackingEvents,
        drawingAbortedEvents,
        layerVisibilityChangedEvents,
    }: ManagedStateConfig): Promise<void> {
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

        if (roadClosureTrackingEvents) {
            await this.startTrackingRoadClosuresEvents();
        } else {
            await this.stopTrackingRoadClosuresEvents();
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
            this.disableLayerVisibilityChangedEvents();
            await this.stopTrackingRoadLayerEvents();
        }
    }

    public async handleLayerEnabled(): Promise<void> {
        this.debugLog('WMEEventsController: Handling layer enabled event');
        this.lastState = SVLEvents.LAYER_ENABLED;
        await this.enqueueStateTransition({
            zoomEvents: true,
            countryChangeEvents: true,
            dataModelEvents: true,
            wmeSettingsChangedEvents: true,
            nodeTrackingEvents: true,
            segmentTrackingEvents: true,
            roadClosureTrackingEvents: true,
            drawingAbortedEvents: false,
            layerVisibilityChangedEvents: true,
        });
    }

    public async handleSvlAutomaticallyDisabled(): Promise<void> {
        this.lastState = SVLEvents.AUTOMATICALLY_DISABLED;
        await this.enqueueStateTransition({
            zoomEvents: true,
            countryChangeEvents: false,
            dataModelEvents: false,
            wmeSettingsChangedEvents: false,
            nodeTrackingEvents: false,
            segmentTrackingEvents: false,
            roadClosureTrackingEvents: false,
            drawingAbortedEvents: false,
            layerVisibilityChangedEvents: false,
        });
    }

    public async handleUserDisabled(): Promise<void> {
        this.debugLog('WMEEventsController: Handling user disabled event');
        this.lastState = SVLEvents.USER_DISABLED;
        await this.enqueueStateTransition({
            zoomEvents: false,
            countryChangeEvents: false,
            dataModelEvents: false,
            wmeSettingsChangedEvents: false,
            nodeTrackingEvents: false,
            segmentTrackingEvents: false,
            roadClosureTrackingEvents: false,
            drawingAbortedEvents: false,
            layerVisibilityChangedEvents: false,
        });
    }

    public async handleSvlDrawingAborted(): Promise<void> {
        this.debugLog('WMEEventsController: Handling drawing aborted event');
        this.lastState = SVLEvents.DRAWING_ABORTED;
        await this.enqueueStateTransition({
            zoomEvents: true,
            countryChangeEvents: true,
            dataModelEvents: false,
            wmeSettingsChangedEvents: true,
            nodeTrackingEvents: false,
            segmentTrackingEvents: false,
            roadClosureTrackingEvents: false,
            drawingAbortedEvents: true,
            layerVisibilityChangedEvents: false,
        });
    }

    private enableSDKEvents({ type, sdkEvent }: { type: SVLCallbackEventTypes; sdkEvent: SdkEventName }): void {
        if (type === SVLCallbackEventTypes.DATA_MODEL) {
            if (sdkEvent === "wme-data-model-object-changed-id") {
                this.enableDataModelChangedIdEvent();
            } else if (isDataModelArrayEvent(sdkEvent)) {
                this.enableDataModelEventsOfSdkType({ sdkEvent });
            }
            return;
        }
        const callbacks = this.registeredSVLCallbacks.get(type);
        if (!callbacks) {
            return;
        }
        const eventCallbacks = callbacks.get(sdkEvent as SdkEventsWithoutCallbacks);
        if (!eventCallbacks || eventCallbacks.cleanUp) {
            return;
        }
        this.debugLog(`WMEEventsController: Enabling event ${sdkEvent}`);
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
            void exec.callback(...args);
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
                void exec.callback({ dataModelName, objectIds: Array.from(objectIds) });
            }
        }, exec.deferInMs);
    }

    private enableDataModelChangedIdEvent(): void {
        const changedIdExec = this.registeredSVLDataModelChangedIdCallback;
        if (!changedIdExec || changedIdExec.cleanUp) {
            return;
        }
        this.debugLog('WMEEventsController: Enabling data model event wme-data-model-object-changed-id');
        changedIdExec.cleanUp = this.mediator.wmeSDK.Events.on({
            eventName: "wme-data-model-object-changed-id",
            eventHandler: changedIdExec.callback,
        });
    }

    private enableAllDataModelEvents(): void {
        this.registeredSVLDataModelCallbacks.forEach((_value, key) => {
            this.enableDataModelEventsOfSdkType({ sdkEvent: key });
        });
        this.enableDataModelChangedIdEvent();
    }

    private enableDataModelEventsOfSdkType({ sdkEvent }: { sdkEvent: SdkDataModelArrayEvents }): void {
        const callbacks = this.registeredSVLDataModelCallbacks.get(sdkEvent);
        if (!callbacks || callbacks.cleanUp) {
            return;
        }
        this.debugLog(`WMEEventsController: Enabling data model event ${sdkEvent}`);
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
                },
            });
        }
    }

    private disableDataModelEvents(): void {
        this.registeredSVLDataModelCallbacks.forEach((value) => {
            if (value.timeoutId) {
                clearTimeout(value.timeoutId);
                value.timeoutId = undefined;
            }
            value.pendingObjectIdsByModel.clear();
            value.cleanUp?.();
            value.cleanUp = null;
        });

        if (this.registeredSVLDataModelChangedIdCallback) {
            this.registeredSVLDataModelChangedIdCallback.cleanUp?.();
            this.registeredSVLDataModelChangedIdCallback.cleanUp = null;
        }
    }

    private enableZoomEvents(): void {
        this.enableAllEventsOfType(SVLCallbackEventTypes.ZOOM);
    }

    private disableZoomEvents(): void {
        this.disableAllCallbacksOfType(SVLCallbackEventTypes.ZOOM);
    }

    private enableCountryChangeEvent(): void {
        this.enableAllEventsOfType(SVLCallbackEventTypes.COUNTRY_CHANGE);
    }

    private disableCountryChangeEvent(): void {
        this.disableAllCallbacksOfType(SVLCallbackEventTypes.COUNTRY_CHANGE);
    }

    private enableLayerVisibilityChangedEvents(): void {
        this.enableAllLayerVisibilityChangedEvents();
    }

    private disableLayerVisibilityChangedEvents(): void {
        this.disableAllLayerVisibilityChangedEvents();
    }

    private enableAllLayerVisibilityChangedEvents(): void {
        this.registeredSVLLayerVisibilityCallbacks.forEach((_value, key) => {
            this.enableLayerVisibilityChangedEventsOfSdkType({ sdkEvent: key });
        });
    }

    private enableLayerVisibilityChangedEventsOfSdkType({ sdkEvent }: { sdkEvent: SdkEventWithStringParameter }): void {
        const callbacks = this.registeredSVLLayerVisibilityCallbacks.get(sdkEvent);
        if (!callbacks || callbacks.cleanUp) {
            return;
        }
        this.debugLog(`WMEEventsController: Enabling layer visibility changed event ${sdkEvent}`);
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
        this.registeredSVLLayerVisibilityCallbacks.forEach((value) => {
            if (value.timeoutId) {
                clearTimeout(value.timeoutId);
                value.timeoutId = undefined;
            }
            value.cleanUp?.();
            value.cleanUp = null;
        });
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

        const callbacks = this.registeredSVLCallbacks.get(eventType);
        if (!callbacks) {
            return;
        }

        for (const callback of callbacks.values()) {
            if (callback.timeoutId) {
                clearTimeout(callback.timeoutId);
                callback.timeoutId = undefined;
            }
            callback.cleanUp?.();
            callback.cleanUp = null;
        }
    }

    private async startTrackingRoadLayerEvents(): Promise<void> {
        if (this.isTrackingRoadLayer) {
            return;
        }
        try {
            await this.mediator.wmeSDK.Events.trackLayerEvents({ layerName: "roads" });
            this.isTrackingRoadLayer = true;
        } catch (error) {
            this.debugLog('Failed to start tracking roads layer events', error);
        }
    }

    private async stopTrackingRoadLayerEvents(): Promise<void> {
        if (!this.isTrackingRoadLayer) {
            return;
        }
        this.isTrackingRoadLayer = false;
        try {
            await this.mediator.wmeSDK.Events.stopLayerEventsTracking({ layerName: "roads" });
        } catch (error) {
            this.debugLog('Failed to stop tracking roads layer events', error);
        }
    }

    private async startTrackingSegmentsEvents(): Promise<void> {
        if (this.isTrackingSegments) {
            return;
        }
        this.debugLog('Registering segment events');
        await this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "segments" });
        this.isTrackingSegments = true;
    }

    private async stopTrackingSegmentsEvents(): Promise<void> {
        if (!this.isTrackingSegments) {
            return;
        }
        this.debugLog('Removing segment events');
        this.isTrackingSegments = false;
        try {
            await this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "segments" });
        } catch (error) {
            this.debugLog('Failed to stop tracking segments data model', error);
        }
    }

    private async startTrackingNodesEvents(): Promise<void> {
        if (this.isTrackingNodes) {
            return;
        }
        this.debugLog('Registering node events');
        await this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "nodes" });
        this.isTrackingNodes = true;
    }

    private async stopTrackingNodesEvents(): Promise<void> {
        if (!this.isTrackingNodes) {
            return;
        }
        this.debugLog('Removing node events');
        this.isTrackingNodes = false;
        try {
            await this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "nodes" });
        } catch (error) {
            this.debugLog('Failed to stop tracking nodes data model', error);
        }
    }

    private async startTrackingRoadClosuresEvents(): Promise<void> {
        if (this.isTrackingRoadClosures) {
            return;
        }
        this.debugLog('Registering road closure events');
        try {
            await this.mediator.wmeSDK.Events.trackDataModelEvents({ dataModelName: "roadClosures" });
            this.isTrackingRoadClosures = true;
        } catch (error) {
            this.debugLog('Failed to start tracking roadClosures data model', error);
        }
    }

    private async stopTrackingRoadClosuresEvents(): Promise<void> {
        if (!this.isTrackingRoadClosures) {
            return;
        }
        this.debugLog('Removing road closure events');
        this.isTrackingRoadClosures = false;
        try {
            await this.mediator.wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "roadClosures" });
        } catch (error) {
            this.debugLog('Failed to stop tracking roadClosures data model', error);
        }
    }

    private enableAllEventsOfType(eventType: SVLCallbackEventTypes): void {
        const callbacks = this.registeredSVLCallbacks.get(eventType);
        if (!callbacks) {
            return;
        }
        for (const wmeEvent of callbacks.keys()) {
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
