import {
    CommandHandler,
    CommandPayload
} from "../index";

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
            await this.queue.previous();

        if (!item) {

            console.log(
                "Already at first video."
            );

            return;

        }

        console.log(

            "[QUEUE] Previous:",

            item.title,

            item.videoId

        );

        await this.player.openVideo(
            item.videoId
        );

    }

}