import {
    Browser,
    BrowserContext,
    Page
} from "playwright";

import { BrowserLauncher } from "./BrowserLauncher";
import { BrowserState } from "./BrowserState";
import { ConfigService } from "../services/ConfigService";
import { LoggerService } from "../services/LoggerService";

export class BrowserManager {

    private readonly launcher: BrowserLauncher;

    private browser: Browser | null = null;

    private context: BrowserContext | null = null;

    private page: Page | null = null;

    private state: BrowserState = BrowserState.STOPPED;

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

        this.browser = await this.launcher.launch(config.browser);

        this.context = await this.browser.newContext({

            viewport: config.browser.viewport

        });

        this.page = await this.context.newPage();

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

        await this.browser.close();

        this.browser = null;

        this.context = null;

        this.page = null;

        this.state = BrowserState.STOPPED;

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

        this.browser?.on("disconnected", () => {

            LoggerService.warn("Browser disconnected.");

            this.state = BrowserState.ERROR;

        });

    }

}