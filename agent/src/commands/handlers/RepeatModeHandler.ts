import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    QueueService
} from "../../services/QueueService";

import {
    RepeatMode
} from "../../queue/RepeatMode";

export class RepeatModeHandler
implements CommandHandler {

    constructor(

        private readonly queue:
            QueueService,

        private readonly mode:
            RepeatMode

    ) {}

    async execute(
        command: CommandPayload
    ) {

        await this.queue.setRepeatMode(
            this.mode
        );

        console.log(
            "Repeat:",
            this.mode
        );

    }

}