export interface BrowserInfo {

    name: string;

    version: string;

    channel: string;

    persistent: boolean;

    executable?: string;

    profilePath?: string;

    launchedAt?: number;

}