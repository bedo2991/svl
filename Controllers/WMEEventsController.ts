import SVLMediator from "../SVLMediator";
import AbstractController from "./AbstractController";
import { SVLEvents } from "./AbstractMediator";

export default class WMEEventsController extends AbstractController {
    // Singleton pattern
    private static instance: WMEEventsController | null = null;
    private segmentEventsRemoveCallbacks: Array<() => void> = [];
    private nodeEventsRemoveCallbacks: Array<() => void> = [];
    private drawingAbortedEventsRemoveCallbacks: Array<() => void> = [];
    private zoomEventsRemoveCallbacks: Array<() => void> = [];
    private countryChangeEventsRemoveCallbacks: Array<() => void> = [];

    private constructor({ mediator }: { mediator: SVLMediator }) {
        // Private constructor to prevent direct instantiation
        super(mediator);
        this.mediator.subscribe(SVLEvents.LAYER_ENABLED, this.handleLayerEnabled.bind(this));
        this.mediator.subscribe(SVLEvents.USER_DISABLED, this.handleUserDisabled);
        this.mediator.subscribe(SVLEvents.AUTOMATICALLY_DISABLED, this.handleSvlAutomaticallyDisabled);
        this.mediator.subscribe(SVLEvents.DRAWING_ABORTED, this.handleSvlDrawingAborted.bind(this));
    }

    public static getInstance(): WMEEventsController {
        if (!WMEEventsController.instance) {
            throw new Error("WMEEventsController not initialized. Call initialize() first.");
        }
        return WMEEventsController.instance;
    }

    public static initialize({ mediator }: { mediator: SVLMediator }): void {
        if (!WMEEventsController.instance) {
            WMEEventsController.instance = new WMEEventsController({ mediator });
        }
    }

    public handleLayerEnabled() {

    }

    public handleSvlAutomaticallyDisabled() {

    }

    public handleUserDisabled() {

    }

    public handleSvlDrawingAborted() {

    }

    private registerZoomEvents() {

    }

    private unregisterZoomEvents() {
        this.removeCallbacks(this.zoomEventsRemoveCallbacks);
    }

    private registerCountryChangeEvent() {

    }

    private unregisterCountryChangeEvent() {
        this.removeCallbacks(this.countryChangeEventsRemoveCallbacks);
    }

    private registerDataModelEvents(): void {

    }

    private removeCallbacks(callbacks: Array<() => void>): void {
        while (callbacks.length > 0) {
            let callback = callbacks.pop();
            if (callback) {
                callback();
            }
        }
    }

    private unregisterDataModelEvents(): void {
        this.removeCallbacks(this.segmentEventsRemoveCallbacks);
        this.removeCallbacks(this.nodeEventsRemoveCallbacks);
        this.removeCallbacks(this.drawingAbortedEventsRemoveCallbacks);
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

    private registerDrawingAbortedEvents(): void {

    }

    private unregisterDrawingAbortedEvents(): void {

    }
}