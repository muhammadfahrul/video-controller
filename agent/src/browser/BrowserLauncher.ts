import { Browser, chromium } from "playwright";
import { BrowserOptions } from "./BrowserOptions";

export class BrowserLauncher {

    public async launch(options: BrowserOptions): Promise<Browser> {

        return await chromium.launch({

            headless: options.headless,

            channel: options.channel ?? undefined,

            args: options.args

        });

    }

}