import {

    socketService

} from "../socket";

import type {

    PlayerCommand

} from "./PlayerCommand";

export class PlayerCommandService {

    private emit(

        command: PlayerCommand

    ): void {

        console.log(

            "[PlayerCommand]",

            command

        );

        socketService.emit(

            "player:command",

            command

        );

    }

    play(

        agentId: string

    ): void {

        this.emit({

            agentId,

            type: "PLAY"

        });

    }

    pause(

        agentId: string

    ): void {

        this.emit({

            agentId,

            type: "PAUSE"

        });

    }

    stop(

        agentId: string

    ): void {

        this.emit({

            agentId,

            type: "STOP"

        });

    }

    next(

        agentId: string

    ): void {

        this.emit({

            agentId,

            type: "NEXT"

        });

    }

    previous(

        agentId: string

    ): void {

        this.emit({

            agentId,

            type: "PREVIOUS"

        });

    }

    fullscreen(

        agentId: string

    ): void {

        this.emit({

            agentId,

            type: "FULLSCREEN"

        });

    }

    volume(

        agentId: string,

        volume: number

    ): void {

        this.emit({

            agentId,

            type: "VOLUME",

            volume

        });

    }

    seek(

        agentId: string,

        second: number

    ): void {

        this.emit({

            agentId,

            type: "SEEK",

            seek: second

        });

    }

    playVideo(

        agentId: string,

        videoId: string

    ): void {

        this.emit({

            agentId,

            type: "PLAY_VIDEO",

            videoId

        });

    }

    addQueue(

        agentId: string,

        videoId: string

    ): void {

        this.emit({

            agentId,

            type: "ADD_QUEUE",

            videoId

        });

    }

    repeat(

        agentId: string,

        repeatMode: string

    ): void {

        this.emit({

            agentId,

            type: "REPEAT",

            repeatMode

        });

    }

}