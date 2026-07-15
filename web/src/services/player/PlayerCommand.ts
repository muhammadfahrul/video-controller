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

        | "REPEAT_ALL"

        | "STOP"

        | "NEXT"

        | "PREVIOUS"

        | "FULLSCREEN"

        | "EXIT_FULLSCREEN"

        | "TOGGLE_FULLSCREEN"

        | "VOLUME"

        | "MUTE"

        | "UNMUTE"

        | "OPEN_VIDEO"

        | "ADD_QUEUE"

        | string;

    volume?: number;

    seek?: number;

    position?: number;

    item?: {
        id?: string;
        videoId: string;
        title?: string;
        thumbnail?: string;
        channel?: string;
        duration?: string;
    };

    videoId?: string;

    repeatMode?: string;

    id?:string;

}