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

    private getStealthScript(): string {
        return `
            // Override navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission } as PermissionStatus) :
                    originalQuery(parameters)
            );

            // Override navigator.plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Override navigator.languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });

            // Add chrome runtime
            window.chrome = {
                runtime: {}
            };

            // Prevent detection of Playwright
            window.navigator.chrome = true;
        `;
    }

    public async launchWithStealth(
        options: BrowserOptions
    ): Promise<BrowserContext> {

        const context = await this.launchPersistent(options);

        // Add stealth script to all existing pages
        for (const page of context.pages()) {
            await page.addInitScript(this.getStealthScript());
        }

        return context;
    }

}