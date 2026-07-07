import { BrowserManager } from "../browser/BrowserManager";
import { YouTubeController } from "../youtube/YouTubeController";
import { Logger } from "../logger/Logger";

export class Agent {

    private browser!: BrowserManager;
    private youtube!: YouTubeController;

    async start(): Promise<void> {

        this.browser = new BrowserManager();

        await this.browser.start();

        this.youtube = new YouTubeController(
            this.browser.getPage()
        );

        Logger.info("Starting Browser...");

    }

    getYouTube(): YouTubeController {

        return this.youtube;

    }

}