import SVLMediator from "../SVLMediator";

export default abstract class AbstractController {
    protected mediator: SVLMediator;

    constructor(mediator: SVLMediator) {
        this.mediator = mediator;
    }
}