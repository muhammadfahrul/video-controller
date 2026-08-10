import { BrowserManager } from "../browser";


export class BrowserService {


    private readonly browserManager:
        BrowserManager;



    constructor(){

        this.browserManager =
            new BrowserManager();

    }



    async start(){

        await this.browserManager.start();

    }



    async stop(){

        await this.browserManager.stop();

    }



    getPage(){

        return this.browserManager.getPage();

    }


    public getBrowserManager(): BrowserManager {

        return this.browserManager;

    }

    /**
     * Display an image in the browser page.
     */
    public async showImage(imagePath: string): Promise<void> {
        await this.browserManager.showImage(imagePath);
    }

    /**
     * Get the path to the data directory.
     */
    public getDataPath(): string {
        return this.browserManager.getDataPath();
    }
}