import {
    CommandHandler,
    CommandPayload
} from "../types";

import {
    PlayerService
} from "../../services/PlayerService";

export class ExitFullscreenHandler
implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "ExitFullscreenHandler.execute"
        );

        await this.player.exitFullscreen();

    }

}