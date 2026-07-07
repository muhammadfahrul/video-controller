import {
    Browser,
    BrowserContext,
    chromium,
    Page
} from "playwright";

import { config } from "../config/config";
import { BrowserState } from "./BrowserState";

export class BrowserManager {

    private browser?: Browser;
    private context?: BrowserContext;
    private page?: Page;

    private state: BrowserState = BrowserState.STOPPED;

    async start(): Promise<void> {

        if (this.state === BrowserState.RUNNING) {
            return;
        }

        this.state = BrowserState.STARTING;

        try {

            this.browser = await chromium.launch({
                headless: config.headless,
                args: config.browserArgs
            });

            this.context = await this.browser.newContext({
                viewport: null
            });

            this.page = await this.context.newPage();

            await this.page.goto(config.youtubeHome);

            this.initializeEvents();

            this.state = BrowserState.RUNNING;

        } catch (error) {

            this.state = BrowserState.ERROR;

            throw error;

        }

    }

    async stop(): Promise<void> {

        if (!this.browser) {
            return;
        }

        this.state = BrowserState.STOPPING;

        await this.browser.close();

        this.browser = undefined;
        this.context = undefined;
        this.page = undefined;

        this.state = BrowserState.STOPPED;

    }

    async restart(): Promise<void> {

        await this.stop();

        await this.start();

    }

    isRunning(): boolean {

        return this.state === BrowserState.RUNNING;

    }

    getState(): BrowserState {

        return this.state;

    }

    getBrowser(): Browser {

        if (!this.browser) {
            throw new Error("Browser belum dijalankan.");
        }

        return this.browser;

    }

    getContext(): BrowserContext {

        if (!this.context) {
            throw new Error("BrowserContext belum tersedia.");
        }

        return this.context;

    }

    getPage(): Page {

        if (!this.page) {
            throw new Error("Page belum tersedia.");
        }

        return this.page;

    }

    private initializeEvents(): void {

        this.browser?.on("disconnected", () => {

            console.warn("Browser disconnected.");

            this.state = BrowserState.ERROR;

        });

        this.page?.on("close", () => {

            console.warn("Page closed.");

        });

    }

}