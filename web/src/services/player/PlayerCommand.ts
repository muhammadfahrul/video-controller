export interface PlayerCommand {

    agentId: string;

    type:

        | "PLAY"

        | "PAUSE"

        | "SEEK"

        | "PLAY_PLAYLIST_ITEM"

        | "REMOVE_PLAYLIST"

        | "CLEAR_PLAYLIST"

        | "SHUFFLE_PLAYLIST"

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

        | "ADD_PLAYLIST"

        | "SKIP_AD"

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