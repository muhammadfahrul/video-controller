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

    // True when this snapshot is a cached last-healthy fallback rather than
    // a live read (see PlayerService.getSnapshot()), so consumers can tell
    // real-time data from a few-seconds-stale substitute.
    isFallbackSnapshot?: boolean;

}