export interface PlayerStatus {

    playing: boolean;

    paused: boolean;

    volume: number;

    muted: boolean;

    currentTime: number;

    duration: number;

    videoId?: string;

}