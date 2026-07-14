import { BrowserChannel } from "../browser/BrowserChannel";
import { AppConfig } from "./AppConfig";

export class ConfigValidator {

    public static validate(

        config: AppConfig

    ): void {

        this.validateBrowser(config);

    }

    private static validateBrowser(

        config: AppConfig

    ) {

        const channel =

            config.browser.channel;

        if (channel === null) {

            return;

        }

        const valid = Object.values(

            BrowserChannel

        ).includes(channel);

        if (!valid) {

            throw new Error(

                `Invalid browser channel: ${channel}`

            );

        }

    }

}