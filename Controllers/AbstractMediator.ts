export enum AlertType {
    INFO = 'info',
    ERROR = 'error',
    SUCCESS = 'success',
    WARNING = 'warning',
    DEBUG = 'debug',
};

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
    private isInitializationCompleted: boolean = false;
    private subscribers: Map<string, ((data?: any) => void)[]> = new Map();

    public abstract notify(sender: any, event: any): void;

    public abstract alert(type: AlertType, message: string): void;

    public abstract _(key: string, ...args: any[]): string;

    public subscribe(event: SVLEvents, callback: (data?: any) => void): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push(callback);
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
        if (eventSubscribers) {
            eventSubscribers.forEach(callback => callback(data));
        }
    }

    protected setInitializationCompleted(): void {
        this.isInitializationCompleted = true;
    }

    public initializationCompleted(): Promise<void> {
        return new Promise((resolve) => {
            const checkInitialization = () => {
                if (this.isInitializationCompleted) {
                    resolve();
                } else {
                    setTimeout(checkInitialization, 300);
                }
            };
            checkInitialization();
        });
    }
}