import SVLMediator from "../SVLMediator";
import AbstractMediator from "./AbstractMediator";
import { InitializationInterface } from "./InitializationInterface";

export default abstract class AbstractController {
    protected mediator: SVLMediator;
    private isInitializationCompleted: boolean = false;

    constructor(mediator: SVLMediator) {
        this.mediator = mediator;
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