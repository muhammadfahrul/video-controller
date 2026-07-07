import {
    CommandHandler,
    CommandPayload
} from "../types";

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

        this.queue.clear();

        console.log(
            "Queue cleared"
        );

    }

}