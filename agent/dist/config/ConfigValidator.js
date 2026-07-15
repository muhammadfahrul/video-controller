"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidator = void 0;
class ConfigValidator {
    static validate(config) {
        this.validateBrowser(config);
    }
    static validateBrowser(config) {
        const channel = config.browser.channel;
        if (channel === null) {
            return;
        }
        // Allow any channel string
        if (typeof channel !== "string") {
            throw new Error(`Invalid browser channel: ${channel}`);
        }
    }
}
exports.ConfigValidator = ConfigValidator;
