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
            !command.videoId
        ) {

            throw new Error(
                "videoId is required"
            );

        }

        this.queue.add({

            id: randomUUID(),

            videoId:
                command.videoId,

            title:
                command.title ??
                "Unknown",

            addedAt:
                Date.now()

        });

        console.log(

            "Queue size:",

            this.queue.size()

        );

    }

}