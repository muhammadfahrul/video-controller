export interface PlayerCommand {

    agentId: string;

    type: 

        | "PLAY"

        | "PAUSE"

        | "SEEK"

        | "PLAY_QUEUE_ITEM"

        | "REMOVE_QUEUE"

        | "CLEAR_QUEUE"

        | "SHUFFLE_QUEUE"

        | "REPEAT_OFF"

        | "REPEAT_ONE"

        | "REPEAT_ALL";

    volume?: number;

    seek?: number;

    videoId?: string;

    repeatMode?: string;

    id?:string;

}