"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    browser: {
        headless: false,
        channel: null,
        viewport: {
            width: 1920,
            height: 1080
        },
        args: [
            "--start-maximized",
            "--kiosk",
            "--window-size=1920,1080",
            "--window-position=0,0",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process"
        ]
    },
    youtube: {
        home: "https://www.youtube.com"
    },
    health: {
        interval: 5000
    },
    logging: {
        level: "info"
    }
};
