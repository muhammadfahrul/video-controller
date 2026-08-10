export interface PlayerStatus {
    videoId: string | null;
    title: string | null;

    playing: boolean;
    paused: boolean;
    ended: boolean;

    currentTime: number;
    duration: number;

    volume: number;
    muted: boolean;
}