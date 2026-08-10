import { Browser, BrowserContext, Page } from "playwright";

export interface BrowserAdapter {

    start(): Promise<void>;

    stop(): Promise<void>;

    restart(): Promise<void>;

    getBrowser(): Browser;

    getContext(): BrowserContext;

    getPage(): Page;

    isRunning(): boolean;

}