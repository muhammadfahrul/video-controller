import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    PlayerService
} from "../../services/PlayerService";

export class FullscreenHandler
implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "FullscreenHandler.execute"
        );

        await this.player.fullscreen();

    }

}