export interface BrowserOptions {

    headless: boolean;

    channel?: string;

    args: string[];

    viewport: {

        width: number;

        height: number;

    } | null;

}