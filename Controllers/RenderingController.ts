import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";

export default class RenderingController extends AbstractController {
    // Singleton pattern
    private static instance: RenderingController | null = null;
    private constructor({ mediator }: { mediator: SVLMediator }) {
        super(mediator);
    }
    public static getInstance(): RenderingController {
        if (!RenderingController.instance) {
            throw new Error("RenderingController not initialized. Call initialize() first.");
        }
        return RenderingController.instance;
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<RenderingController> {
        if (!RenderingController.instance) {
            RenderingController.instance = new RenderingController({ mediator });
            return RenderingController.instance;
        } else {
            throw new Error("RenderingController is already initialized.");
        }
    }
}