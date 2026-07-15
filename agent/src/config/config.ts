import configJson from './config.json';

export interface AppConfig {

    browser: {

        headless: boolean;

        channel: string | null;

        args: string[];

        viewport?: {

            width: number;

            height: number;

        } | null;

    };

    youtube: {

        home: string;

    };

    health: {

        interval: number;

    };

    logging: {

        level: string;

    };

}

export const config: AppConfig = configJson as AppConfig;