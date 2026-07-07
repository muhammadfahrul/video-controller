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

export class PreviousHandler
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

        console.log(
            "PreviousHandler.execute",
            command
        );

        const item =
            this.queue.previous();

        if (!item) {

            console.log(
                "Already at first video."
            );

            return;

        }

        await this.player.openVideo(
            item.videoId
        );

    }

}