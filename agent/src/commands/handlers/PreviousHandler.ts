import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlayerService
} from "../../services/PlayerService";

import {
    PlaylistService
} from "../../services/PlaylistService";

export class PreviousHandler
    implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService,

        private readonly playlist:
            PlaylistService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "PreviousHandler.execute",
            command
        );

        const item =
            await this.playlist.previous();

        if (!item) {

            console.log(
                "Already at first video."
            );

            return;

        }

        console.log(

            "[PLAYLIST] Previous:",

            item.title,

            item.videoId

        );

        await this.player.openVideo(
            item.videoId
        );

    }

}