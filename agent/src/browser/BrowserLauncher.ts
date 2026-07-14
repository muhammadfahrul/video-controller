import { Browser, BrowserContext, chromium } from "playwright";
import { BrowserOptions } from "./BrowserOptions";
import { BrowserProfile } from "./BrowserProfile";
import { LoggerService } from "../services/LoggerService";

export class BrowserLauncher {

    public async launch(options: BrowserOptions): Promise<Browser> {

        return await chromium.launch({

            headless: options.headless,

            channel: options.channel ?? undefined,

            args: options.args

        });

    }

    public async launchPersistent(
        options: BrowserOptions
    ): Promise<BrowserContext> {

        const profile =
            new BrowserProfile();

        try {

            LoggerService.info(
                "Launching Google Chrome..."
            );

            return await this.launchChrome(

                profile.getPath(),

                options

            );

        }

        catch (error) {

            LoggerService.warn(

                "Chrome unavailable, fallback to Chromium."

            );

            return await this.launchChromium(

                profile.getPath(),

                options

            );

        }

    }


    private async launchChrome(
        profile: string,
        options: BrowserOptions
    ): Promise<BrowserContext> {

        return chromium.launchPersistentContext(

            profile,

            {

                channel: "chrome",

                headless: options.headless,

                viewport: options.viewport,

                args: options.args

            }

        );

    }

    private async launchChromium(
        profile: string,
        options: BrowserOptions
    ): Promise<BrowserContext> {

        return chromium.launchPersistentContext(

            profile,

            {

                headless: options.headless,

                viewport: options.viewport,

                args: options.args

            }

        );

    }

}