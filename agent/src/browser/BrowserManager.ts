import path from "path";

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

        if (this.state === BrowserState.RUNNING || this.state === BrowserState.STARTING) {

            LoggerService.warn("Browser already running or starting.");

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

            await this.launcher.launchWithStealth(

                config.browser

            );

        // Maximize window after launch
        const initialPages = this.context.pages();
        if (initialPages.length > 0) {
            const page = initialPages[0];
            await page.evaluate(() => {
                if (window.screen) {
                    window.moveTo(0, 0);
                    window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                }
            });
        }

        const browser =
            this.context.browser();

        // `this.browser` was previously never assigned (the old `chromium.launch()`
        // path that set it is commented out above in favor of launchWithStealth()),
        // which made stop()'s `if (!this.browser) return` guard always true - stop()
        // was silently a no-op, leaking the browser process/profile lock on every
        // restart. getBrowser() throws when null, so keep this in sync.
        this.browser = browser ?? null;

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

        const allContextPages =

            this.context.pages();

        if (allContextPages.length > 0) {

            this.page =
                allContextPages[0];

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

        if (!this.context) {

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

    /**
     * Display an image in the browser page using a local file path.
     * Useful for showing start screen or expired screen images.
     */
    public async showImage(imagePath: string): Promise<void> {
        if (!this.page) {
            throw new Error("Page has not been created.");
        }

        const fs = await import("fs");
        if (!fs.existsSync(imagePath)) {
            LoggerService.warn(`Image file not found: ${imagePath}`);
            return;
        }

        // Convert to file:// URL
        const fileUrl = `file://${imagePath}`;
        
        await this.page.goto(fileUrl, { waitUntil: "domcontentloaded" });
        LoggerService.info(`Displayed image: ${imagePath}`);
    }

    /**
     * Get the path to the data directory.
     */
    public getDataPath(): string {
        return path.join(process.cwd(), "data");
    }

    public getState(): BrowserState {

        return this.state;

    }

    private registerEvents(): void {

        // this.browser?.on("disconnected", () => {

        //     LoggerService.warn("Browser disconnected.");

        //     this.state = BrowserState.ERROR;

        // });

        const browser = this.context?.browser();
        if (browser) {
            browser.on(
                "disconnected",
                () => {
                    LoggerService.warn(
                        "Browser disconnected."
                    );
                    this.state =
                        BrowserState.ERROR;

                    // Clear stale references so hasBrowser()/hasPage()/getPage() (used
                    // by health checks) correctly report the crash instead of
                    // continuing to point at a dead browser process.
                    this.browser = null;
                    this.context = null;
                    this.page = null;
                }
            );
        }

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