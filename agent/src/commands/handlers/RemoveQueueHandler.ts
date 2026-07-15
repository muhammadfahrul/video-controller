import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    QueueService
} from "../../services/QueueService";

export class RemoveQueueHandler
implements CommandHandler {

    constructor(

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

        const removed =
            await this.queue.remove(
                command.id
            );

        console.log(

            "Removed",

            removed

        );

    }

}