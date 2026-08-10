import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlayerService
} from "../../services/PlayerService";

export class OpenVideoHandler
    implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        if (!command.videoId) {

            throw new Error(
                "videoId is required"
            );

        }

        console.log(
            "OpenVideoHandler.execute",
            command
        );

        await this.player.openVideo(
            command.videoId
        );

    }

}