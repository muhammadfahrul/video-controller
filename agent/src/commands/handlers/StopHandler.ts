import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    PlayerService
} from "../../services/PlayerService";

export class StopHandler
    implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "StopHandler.execute",
            command
        );

        await this.player.stop();

    }

}