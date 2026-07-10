import {
    randomUUID
} from "crypto";

import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    QueueService
} from "../../services/QueueService";

export class AddQueueHandler
implements CommandHandler {

    constructor(

        private readonly queue:
            QueueService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        if (
            !command.item
        ) {

            throw new Error(
                "item is required"
            );

        }

        await this.queue.add({

            id: randomUUID(),

            videoId:
                command.item.videoId,

            title:
                command.item.title,

            channel:
                command.item.channel,

            thumbnail:
                command.item.thumbnail,

            duration:
                command.item.duration,

            addedAt:
                Date.now()

        });

        console.log(

            "Queue size:",

            this.queue.size()

        );

    }

}