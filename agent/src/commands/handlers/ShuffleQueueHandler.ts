import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    QueueService
} from "../../services/QueueService";

export class ShuffleQueueHandler
implements CommandHandler {

    constructor(

        private readonly queue:
            QueueService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        await this.queue.shuffle();

        console.log(
            "Queue shuffled"
        );

    }

}