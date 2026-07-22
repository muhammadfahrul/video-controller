import { config } from "../config/config";
import { ConfigValidator } from "../config/ConfigValidator";
import { getLocalIpAddress } from "../utils/network";

export interface AppConfig {

    room: {

        id: string;

        name: string;

    };

    billing: {

        enabled: boolean;

    };

    browser: {

        headless: boolean;

        channel: string | null;

        args: string[];

        viewport: {

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

export class ConfigService {

    private static instance: ConfigService;

    private readonly config: AppConfig;

    private constructor() {

        this.config = config as AppConfig;

        ConfigValidator.validate(
            this.config
        );

    }

    public static getInstance(): ConfigService {

        if (!ConfigService.instance) {

            ConfigService.instance = new ConfigService();

        }

        return ConfigService.instance;

    }

    public getConfig(): AppConfig {

        return this.config;

    }

    public getServerUrl(): string {

        const ip = getLocalIpAddress();

        const port = process.env.PORT || 53331;

        return `http://${ip}:${port}`;

    }

}