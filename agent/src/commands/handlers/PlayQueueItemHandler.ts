import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    PlayerService
} from "../../services/PlayerService";

import {
    QueueService
} from "../../services/QueueService";

export class PlayQueueItemHandler
implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService,

        private readonly queue:
            QueueService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        if (!command.id) {

            throw new Error(
                "Queue id required"
            );

        }

        const item =
            await this.queue.playById(
                command.id
            );

        if (!item) {

            console.log(
                "Queue item not found"
            );

            return;

        }

        await this.player.openVideo(
            item.videoId
        );

    }

}