import dotenv from 'dotenv';

dotenv.config();

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

// Helper to parse || delimiter-separated string to array
const parseBrowserArgs = (): string[] => {
    const args = process.env.BROWSER_ARGS;
    if (!args) return [];
    return args.split('||').map(arg => arg.trim()).filter(arg => arg.length > 0);
};

export const config: AppConfig = {
    room: {
        id: process.env.ROOM_ID || 'room-001',
        name: process.env.ROOM_NAME || 'Room 1'
    },
    billing: {
        enabled: process.env.BILLING_ENABLED !== 'false'
    },
    browser: {
        headless: process.env.BROWSER_HEADLESS !== 'false',
        channel: process.env.BROWSER_CHANNEL || 'chrome',
        args: parseBrowserArgs(),
        viewport: process.env.BROWSER_VIEWPORT === 'true' ? {
            width: parseInt(process.env.BROWSER_VIEWPORT_WIDTH || '1920', 10),
            height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || '1080', 10)
        } : null
    },
    youtube: {
        home: process.env.YOUTUBE_HOME || 'https://www.youtube.com'
    },
    health: {
        interval: parseInt(process.env.HEALTH_INTERVAL || '5000', 10)
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};