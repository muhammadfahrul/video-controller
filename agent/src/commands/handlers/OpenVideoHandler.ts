import {
    randomUUID
} from "crypto";

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

export class OpenVideoHandler
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

        if (!command.videoId) {

            throw new Error(
                "videoId is required"
            );

        }

        console.log(
            "OpenVideoHandler.execute",
            command
        );

        const item =
            await this.playlist.playOrAdd({

                id: randomUUID(),

                videoId:
                    command.videoId,

                title:
                    command.item?.title,

                channel:
                    command.item?.channel,

                thumbnail:
                    command.item?.thumbnail,

                duration:
                    command.item?.duration,

                addedAt:
                    Date.now()

            });

        await this.player.openVideo(
            item.videoId
        );

    }

}
