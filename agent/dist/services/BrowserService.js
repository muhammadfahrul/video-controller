"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserService = void 0;
const browser_1 = require("../browser");
class BrowserService {
    browserManager;
    constructor() {
        this.browserManager =
            new browser_1.BrowserManager();
    }
    async start() {
        await this.browserManager.start();
    }
    async stop() {
        await this.browserManager.stop();
    }
    getPage() {
        return this.browserManager.getPage();
    }
    getBrowserManager() {
        return this.browserManager;
    }
}
exports.BrowserService = BrowserService;
