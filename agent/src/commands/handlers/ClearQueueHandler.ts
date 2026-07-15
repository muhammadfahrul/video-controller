import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    QueueService
} from "../../services/QueueService";

export class ClearQueueHandler
implements CommandHandler {

    constructor(

        private readonly queue:
            QueueService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        await this.queue.clear();

        console.log(
            "Queue cleared"
        );

    }

}