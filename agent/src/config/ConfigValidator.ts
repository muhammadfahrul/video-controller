export class ConfigValidator {

    public static validate(

        config: unknown

    ): void {

        this.validateBrowser(config as any);

    }

    private static validateBrowser(

        config: { browser: { channel: string | null } }

    ) {

        const channel = config.browser.channel;

        if (channel === null) {

            return;

        }

        // Allow any channel string
        if (typeof channel !== "string") {

            throw new Error(

                `Invalid browser channel: ${channel}`

            );

        }

    }

}