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

export class NextHandler
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
            "NextHandler.execute",
            command
        );

        const item =
            await this.playlist.next();

        if (!item) {

            console.log(
                "Already at last video."
            );

            return;

        }

        console.log(

            "[PLAYLIST] Next:",

            item.title,

            item.videoId

        );

        await this.player.openVideo(
            item.videoId
        );

    }

}