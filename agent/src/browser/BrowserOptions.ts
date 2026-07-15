export interface BrowserOptions {

    headless: boolean;

    channel: string | null;

    args: string[];

    viewport?: {

        width: number;

        height: number;

    } | null;

}