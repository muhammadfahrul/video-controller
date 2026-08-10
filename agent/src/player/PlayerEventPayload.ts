import { PlayerEvents } from "./PlayerEvents";


export interface PlayerEventPayload {

    event: PlayerEvents;

    videoId: string | null;

    currentTime: number;

    duration: number;

    timestamp: number;

}