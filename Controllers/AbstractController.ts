import SVLMediator from "../SVLMediator";
import Utils from "../Utils";

export default abstract class AbstractController {
    protected mediator: SVLMediator;

    constructor(mediator: SVLMediator) {
        this.mediator = mediator;
    }

    protected debugLog(message: string, ...args: unknown[]): void {
        Utils.debugLog(message, ...args);
    }
}
