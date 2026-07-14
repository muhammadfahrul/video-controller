import {
    Browser,
    BrowserContext,
    Page
} from "playwright";

import { BrowserLauncher } from "./BrowserLauncher";
import { BrowserState } from "./BrowserState";
import { ConfigService } from "../services/ConfigService";
import { LoggerService } from "../services/LoggerService";
import { BrowserInfo } from "./BrowserInfo";

export class BrowserManager {

    private readonly launcher: BrowserLauncher;

    private browser: Browser | null = null;

    private context: BrowserContext | null = null;

    private page: Page | null = null;

    private state: BrowserState = BrowserState.STOPPED;

    private browserInfo?: BrowserInfo;

    constructor() {

        this.launcher = new BrowserLauncher();

    }

    public async start(): Promise<void> {

        if (this.isRunning()) {

            LoggerService.warn("Browser already running.");

            return;

        }

        this.state = BrowserState.STARTING;

        LoggerService.info("Launching browser...");

        const config = ConfigService
            .getInstance()
            .getConfig();

        // this.browser = await this.launcher.launch(config.browser);

        // console.log(
        //     await this.browser.version()
        // );

        // this.context = await this.browser.newContext({

        //     viewport: config.browser.viewport

        // });

        // this.page = await this.context.newPage();

        this.context =

            await this.launcher.launchPersistent(

                config.browser

            );

        const browser =
            this.context.browser();

        if (browser) {

            this.browserInfo = {

                name: browser.browserType().name(),

                version: await browser.version(),

                channel:
                    config.browser.channel
                    ?? "chromium",

                persistent: true

            };

            LoggerService.info(

                `Browser : ${this.browserInfo.name}`

            );

            LoggerService.info(

                `Version : ${this.browserInfo.version}`

            );

            LoggerService.info(

                `Channel : ${this.browserInfo.channel}`

            );

            LoggerService.info(

                `Persistent : ${this.browserInfo.persistent}`

            );

        }

        const pages =

            this.context.pages();

        if (pages.length > 0) {

            this.page =
                pages[0];

        } else {

            this.page =
                await this.context.newPage();

        }

        this.page.on("console", msg => {

            console.log(

                "[PAGE]",

                msg.type(),

                msg.text()

            );

        });

        this.page.on("pageerror", err => {

            console.error(

                "[PAGE ERROR]",

                err

            );

        });

        this.page.on("requestfailed", request => {

            console.warn(

                "[REQUEST FAILED]",

                request.url(),

                request.failure()?.errorText

            );

        });

        this.page.on("response", response => {

            if (response.status() >= 400) {

                console.warn(

                    "[HTTP]",

                    response.status(),

                    response.url()

                );

            }

        });

        this.registerEvents();

        this.state = BrowserState.RUNNING;

        LoggerService.info("Browser ready.");

    }

    public async stop(): Promise<void> {

        if (!this.browser) {

            return;

        }

        this.state = BrowserState.STOPPING;

        LoggerService.info("Closing browser...");

        // await this.browser.close();

        await this.context?.close();

        this.browser = null;

        this.context = null;

        this.page = null;

        this.state = BrowserState.STOPPED;

        this.browserInfo = undefined;

        LoggerService.info("Browser stopped.");

    }

    public async restart(): Promise<void> {

        LoggerService.info("Restarting browser...");

        await this.stop();

        await this.start();

    }

    public isRunning(): boolean {

        return this.state === BrowserState.RUNNING;

    }

    public getBrowser(): Browser {

        if (!this.browser) {

            throw new Error("Browser has not been started.");

        }

        return this.browser;

    }

    public getContext(): BrowserContext {

        if (!this.context) {

            throw new Error("Context has not been created.");

        }

        return this.context;

    }

    public getPage(): Page {

        if (!this.page) {

            throw new Error("Page has not been created.");

        }

        return this.page;

    }

    public getState(): BrowserState {

        return this.state;

    }

    private registerEvents(): void {

        // this.browser?.on("disconnected", () => {

        //     LoggerService.warn("Browser disconnected.");

        //     this.state = BrowserState.ERROR;

        // });

        this.context.browser()?.on(

            "disconnected",

            () => {

                LoggerService.warn(
                    "Browser disconnected."
                );

                this.state =
                    BrowserState.ERROR;

            }

        );

    }

    public getBrowserInfo()
    : BrowserInfo | undefined {

        return this.browserInfo;

    }


    public hasBrowser(): boolean {

        return this.context !== null;

    }

    public hasPage(): boolean {

        return this.page !== null;

    }

    public isPageClosed(): boolean {

        if (!this.page) {

            return true;

        }

        return this.page.isClosed();

    }

    public async getPageTitle()
    : Promise<string> {

        return this.getPage()
            .title();

    }

}