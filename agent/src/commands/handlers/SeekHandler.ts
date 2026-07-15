import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlayerService
} from "../../services/PlayerService";

export class SeekHandler
    implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        if (
            command.seek === undefined
        ) {

            throw new Error(
                "seek is required"
            );

        }

        console.log(
            "SeekHandler.execute",
            command
        );

        await this.player.seek(
            command.seek
        );

    }

}