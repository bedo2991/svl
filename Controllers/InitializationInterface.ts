export interface InitializationInterface {
    setInitializationCompleted(): void;
    protected initializationCompleted(): Promise<void>;
}