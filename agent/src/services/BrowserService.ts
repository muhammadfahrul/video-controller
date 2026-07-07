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


}