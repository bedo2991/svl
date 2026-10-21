export interface InitializationInterface {
    setInitializationCompleted(): void;
    initializationCompleted(): Promise<void>;
}