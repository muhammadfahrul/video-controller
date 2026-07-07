import { chromium, Browser, Page } from "playwright";

export class BrowserManager {

    private browser?: Browser;

    private page?: Page;

    async start() {

        this.browser = await chromium.launch({

            headless: false

        });

        const context = await this.browser.newContext();

        this.page = await context.newPage();

        await this.page.goto("https://www.youtube.com");

    }

}