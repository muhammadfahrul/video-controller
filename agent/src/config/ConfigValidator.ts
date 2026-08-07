export class ConfigValidator {

    public static validate(

        config: unknown

    ): void {

        this.validateBrowser(config as any);

        this.validateSecurity(config as any);

    }

    private static validateSecurity(

        config: { security: { sharedSecret: string } }

    ) {

        if (!config.security.sharedSecret) {

            throw new Error(
                "VC_SHARED_SECRET is not set in agent/.env - the agent cannot register with the server without it. See .env.example."
            );

        }

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