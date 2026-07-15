export interface PlayerSnapshot {

    playing: boolean;

    currentTime: number;

    duration: number;

    volume: number;

    muted: boolean;

    fullscreen: boolean;

    videoId?: string;

    title?: string;

    channel?: string;

    thumbnail?: string;

}