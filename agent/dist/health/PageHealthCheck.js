"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageHealthCheck = void 0;
class PageHealthCheck {
    browser;
    constructor(browser) {
        this.browser = browser;
    }
    async check() {
        try {
            if (!this.browser.hasPage()) {
                return false;
            }
            const page = this.browser.getPage();
            if (page.isClosed()) {
                return false;
            }
            await page.title();
            await this.browser.getPageTitle();
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.PageHealthCheck = PageHealthCheck;
