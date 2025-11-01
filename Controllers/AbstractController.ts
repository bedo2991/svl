import SVLMediator from "../SVLMediator";
import AbstractMediator from "./AbstractMediator";
import { InitializationInterface } from "./InitializationInterface";

export default abstract class AbstractController {
    protected mediator: SVLMediator;

    constructor(mediator: SVLMediator) {
        this.mediator = mediator;
    }
}