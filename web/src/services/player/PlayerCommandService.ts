import {

    socketService

} from "../socket";

import type {

    PlayerCommand

} from "./PlayerCommand";

import type {

    QueueItem

} from "../../features/queue/types/QueueItem";

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

    exitFullscreen(
        agentId: string
    ) {

        this.emit({

            agentId,

            type: "EXIT_FULLSCREEN"

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

    openVideo(

        agentId: string,

        videoId: string

    ): void {

        this.emit({

            agentId,

            type: "OPEN_VIDEO",

            videoId

        });

    }

    addQueue(

        agentId: string,

        item: QueueItem

    ): void {

        this.emit({

            agentId,

            type: "ADD_QUEUE",

            item

        });

    }

    mute(
        agentId: string
    ) {

        this.emit({

            agentId,

            type: "MUTE"

        });

    }

    unmute(
        agentId: string
    ) {

        this.emit({

            agentId,

            type: "UNMUTE"

        });

    }

    playQueueItem(

        agentId:string,

        queueId:string

    ){

        this.emit({

            agentId,

            type:"PLAY_QUEUE_ITEM",

            id:queueId

        });

    }



    removeQueue(

        agentId:string,

        queueId:string

    ){

        this.emit({

            agentId,

            type:"REMOVE_QUEUE",

            id:queueId

        });

    }



    clearQueue(

        agentId:string

    ){

        this.emit({

            agentId,

            type:"CLEAR_QUEUE"

        });

    }



    shuffleQueue(

        agentId:string

    ){

        this.emit({

            agentId,

            type:"SHUFFLE_QUEUE"

        });

    }



    repeat(

        agentId:string,

        mode:string

    ){

        this.emit({

            agentId,

            type:"REPEAT_" + mode

        });

    }
}

export const playerCommandService =

    new PlayerCommandService();