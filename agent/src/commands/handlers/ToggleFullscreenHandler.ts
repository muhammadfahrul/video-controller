import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlayerService
} from "../../services/PlayerService";

export class ToggleFullscreenHandler
implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "ToggleFullscreenHandler.execute"
        );

        await this.player.toggleFullscreen();

    }

}