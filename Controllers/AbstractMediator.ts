import { AcceptedControllerEvents } from "../svlGlobals";

export enum AlertType {
    INFO = 'info',
    ERROR = 'error',
    SUCCESS = 'success',
    WARNING = 'warning',
    DEBUG = 'debug',
}

// These events are fired by the mediator!
export enum SVLEvents {
    INITIALIZED = 'SVL_INITIALIZED',
    PREFERENCES_LOADED = 'SVL_PREFERENCES_LOADED',
    LAYER_ENABLED = 'SVL_ENABLED',
    DRAWING_ABORTED = 'SVL_DRAWING_ABORTED',
    AUTOMATICALLY_DISABLED = 'SVL_AUTOMATICALLY_DISABLED',
    USER_DISABLED = 'SVL_USER_DISABLED',
    COUNTRY_CHANGED = 'SVL_COUNTRY_CHANGED',
    WME_SETTINGS_CHANGED = 'WME_SETTINGS_CHANGED',
    SVL_SETTINGS_CHANGED = 'SVL_SETTINGS_CHANGED',
    ZOOM_CHANGED = 'SVL_ZOOM_CHANGED',
}

export default abstract class AbstractMediator {
    private subscribers: Map<SVLEvents, Array<(data?: any) => void>> = new Map();

    public abstract notify(sender: unknown, event: AcceptedControllerEvents, data?: unknown): void;

    public abstract alert(type: AlertType, message: string): void;

    public abstract _(key: string, ...args: unknown[]): string;

    public subscribe(event: SVLEvents, callback: (data?: any) => void): void {
        let eventSubscribers = this.subscribers.get(event);
        if (!eventSubscribers) {
            eventSubscribers = [];
            this.subscribers.set(event, eventSubscribers);
        }
        if (!eventSubscribers.includes(callback)) {
            eventSubscribers.push(callback);
        }
    }

    public unsubscribe(event: SVLEvents, callback: (data?: any) => void): void {
        const eventSubscribers = this.subscribers.get(event);
        if (eventSubscribers) {
            const index = eventSubscribers.indexOf(callback);
            if (index > -1) {
                eventSubscribers.splice(index, 1);
            }
        }
    }

    protected emit(event: SVLEvents, data?: any): void {
        const eventSubscribers = this.subscribers.get(event);
        if (eventSubscribers && eventSubscribers.length > 0) {
            for (const callback of [...eventSubscribers]) {
                callback(data);
            }
        }
    }
}
