import { PlayerState } from "./PlayerState";

export interface PlayerStatus {

    state: PlayerState;

    videoId: string | null;

    title: string | null;

    duration: number;

    currentTime: number;

    volume: number;

    muted: boolean;

}