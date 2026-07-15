"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserLauncher = void 0;
const playwright_1 = require("playwright");
const BrowserProfile_1 = require("./BrowserProfile");
const LoggerService_1 = require("../services/LoggerService");
class BrowserLauncher {
    async launch(options) {
        return await playwright_1.chromium.launch({
            headless: options.headless,
            channel: options.channel ?? undefined,
            args: options.args
        });
    }
    async launchPersistent(options) {
        const profile = new BrowserProfile_1.BrowserProfile();
        try {
            LoggerService_1.LoggerService.info("Launching Google Chrome...");
            return await this.launchChrome(profile.getPath(), options);
        }
        catch (error) {
            LoggerService_1.LoggerService.warn("Chrome unavailable, fallback to Chromium.");
            return await this.launchChromium(profile.getPath(), options);
        }
    }
    async launchChrome(profile, options) {
        const viewport = options.viewport;
        return playwright_1.chromium.launchPersistentContext(profile, {
            channel: options.channel ?? "chrome",
            headless: options.headless,
            viewport: viewport,
            args: options.args,
            // Launch in fullscreen/maximized mode
            locale: "en-US",
            geolocation: { latitude: 0, longitude: 0 },
            permissions: ["geolocation"],
        });
    }
    async launchChromium(profile, options) {
        // Use large viewport for maximized window
        const viewport = options.viewport ?? { width: 1920, height: 1080 };
        return playwright_1.chromium.launchPersistentContext(profile, {
            headless: options.headless,
            viewport: viewport,
            args: options.args,
            locale: "en-US",
            geolocation: { latitude: 0, longitude: 0 },
            permissions: ["geolocation"]
        });
    }
    getStealthScript() {
        return `
            // Override navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission } as PermissionStatus) :
                    originalQuery(parameters)
            );

            // Override navigator.plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Override navigator.languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });

            // Add chrome runtime
            window.chrome = {
                runtime: {}
            };

            // Prevent detection of Playwright
            window.navigator.chrome = true;
        `;
    }
    async launchWithStealth(options) {
        const context = await this.launchPersistent(options);
        // Add stealth script to all existing pages
        for (const page of context.pages()) {
            await page.addInitScript(this.getStealthScript());
        }
        return context;
    }
}
exports.BrowserLauncher = BrowserLauncher;
