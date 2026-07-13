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

export class NextHandler
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
            "NextHandler.execute",
            command
        );

        const item =
            await this.queue.next();

        if (!item) {

            console.log(
                "Already at last video."
            );

            return;

        }

        console.log(

            "[QUEUE] Next:",

            item.title,

            item.videoId

        );

        await this.player.openVideo(
            item.videoId
        );

    }

}