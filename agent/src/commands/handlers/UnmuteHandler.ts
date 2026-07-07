import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    PlayerService
} from "../../services/PlayerService";

export class UnmuteHandler
    implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "UnmuteHandler.execute",
            command
        );

        await this.player.unmute();

    }

}