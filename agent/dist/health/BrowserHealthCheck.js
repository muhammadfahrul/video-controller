"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserHealthCheck = void 0;
class BrowserHealthCheck {
    browser;
    constructor(browser) {
        this.browser = browser;
    }
    async check() {
        try {
            if (!this.browser.hasBrowser()) {
                return false;
            }
            if (!this.browser.hasPage()) {
                return false;
            }
            const page = this.browser.getPage();
            return !page.isClosed();
        }
        catch {
            return false;
        }
    }
}
exports.BrowserHealthCheck = BrowserHealthCheck;
