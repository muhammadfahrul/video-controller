export const config = {

    browser: {

        headless: false,

        channel: undefined,

        args: [

            "--start-maximized",

            "--disable-blink-features=AutomationControlled",

            "--disable-dev-shm-usage",

            "--no-sandbox",

            "--disable-setuid-sandbox",

            "--disable-web-security",

            "--disable-features=IsolateOrigins,site-per-process"

        ]

    },

    youtube: {

        home: "https://www.youtube.com"

    }

};