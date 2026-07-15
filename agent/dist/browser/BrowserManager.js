"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserManager = void 0;
const BrowserLauncher_1 = require("./BrowserLauncher");
const BrowserState_1 = require("./BrowserState");
const ConfigService_1 = require("../services/ConfigService");
const LoggerService_1 = require("../services/LoggerService");
class BrowserManager {
    launcher;
    browser = null;
    context = null;
    page = null;
    state = BrowserState_1.BrowserState.STOPPED;
    browserInfo;
    constructor() {
        this.launcher = new BrowserLauncher_1.BrowserLauncher();
    }
    async start() {
        if (this.isRunning()) {
            LoggerService_1.LoggerService.warn("Browser already running.");
            return;
        }
        this.state = BrowserState_1.BrowserState.STARTING;
        LoggerService_1.LoggerService.info("Launching browser...");
        const config = ConfigService_1.ConfigService
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
            await this.launcher.launchWithStealth(config.browser);
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
        const browser = this.context.browser();
        if (browser) {
            this.browserInfo = {
                name: browser.browserType().name(),
                version: await browser.version(),
                channel: config.browser.channel
                    ?? "chromium",
                persistent: true
            };
            LoggerService_1.LoggerService.info(`Browser : ${this.browserInfo.name}`);
            LoggerService_1.LoggerService.info(`Version : ${this.browserInfo.version}`);
            LoggerService_1.LoggerService.info(`Channel : ${this.browserInfo.channel}`);
            LoggerService_1.LoggerService.info(`Persistent : ${this.browserInfo.persistent}`);
        }
        const allContextPages = this.context.pages();
        if (allContextPages.length > 0) {
            this.page =
                allContextPages[0];
        }
        else {
            this.page =
                await this.context.newPage();
        }
        this.page.on("console", msg => {
            console.log("[PAGE]", msg.type(), msg.text());
        });
        this.page.on("pageerror", err => {
            console.error("[PAGE ERROR]", err);
        });
        this.page.on("requestfailed", request => {
            console.warn("[REQUEST FAILED]", request.url(), request.failure()?.errorText);
        });
        this.page.on("response", response => {
            if (response.status() >= 400) {
                console.warn("[HTTP]", response.status(), response.url());
            }
        });
        this.registerEvents();
        this.state = BrowserState_1.BrowserState.RUNNING;
        LoggerService_1.LoggerService.info("Browser ready.");
    }
    async stop() {
        if (!this.browser) {
            return;
        }
        this.state = BrowserState_1.BrowserState.STOPPING;
        LoggerService_1.LoggerService.info("Closing browser...");
        // await this.browser.close();
        await this.context?.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.state = BrowserState_1.BrowserState.STOPPED;
        this.browserInfo = undefined;
        LoggerService_1.LoggerService.info("Browser stopped.");
    }
    async restart() {
        LoggerService_1.LoggerService.info("Restarting browser...");
        await this.stop();
        await this.start();
    }
    isRunning() {
        return this.state === BrowserState_1.BrowserState.RUNNING;
    }
    getBrowser() {
        if (!this.browser) {
            throw new Error("Browser has not been started.");
        }
        return this.browser;
    }
    getContext() {
        if (!this.context) {
            throw new Error("Context has not been created.");
        }
        return this.context;
    }
    getPage() {
        if (!this.page) {
            throw new Error("Page has not been created.");
        }
        return this.page;
    }
    getState() {
        return this.state;
    }
    registerEvents() {
        // this.browser?.on("disconnected", () => {
        //     LoggerService.warn("Browser disconnected.");
        //     this.state = BrowserState.ERROR;
        // });
        const browser = this.context?.browser();
        if (browser) {
            browser.on("disconnected", () => {
                LoggerService_1.LoggerService.warn("Browser disconnected.");
                this.state =
                    BrowserState_1.BrowserState.ERROR;
            });
        }
    }
    getBrowserInfo() {
        return this.browserInfo;
    }
    hasBrowser() {
        return this.context !== null;
    }
    hasPage() {
        return this.page !== null;
    }
    isPageClosed() {
        if (!this.page) {
            return true;
        }
        return this.page.isClosed();
    }
    async getPageTitle() {
        return this.getPage()
            .title();
    }
}
exports.BrowserManager = BrowserManager;
