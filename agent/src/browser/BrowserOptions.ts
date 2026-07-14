import { BrowserChannel } from "./BrowserChannel";

export interface BrowserOptions {

    headless: boolean;

    channel: BrowserChannel | null;

    args: string[];

    viewport: {

        width: number;

        height: number;

    } | null;

}