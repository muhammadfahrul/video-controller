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

export class AddPlaylistHandler
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

        if (
            !command.item
        ) {

            throw new Error(
                "item is required"
            );

        }

        // Playlist was empty before this add, so it becomes the current
        // item (PlaylistService.add sets currentIndex to 0) but nothing
        // would otherwise load it into the player - start it right away
        // instead of requiring a separate click on the playlist item.
        const wasEmpty =
            this.playlist.size() === 0;

        await this.playlist.add({

            id: randomUUID(),

            videoId:
                command.item.videoId,

            title:
                command.item.title,

            channel:
                command.item.channel,

            thumbnail:
                command.item.thumbnail,

            duration:
                command.item.duration,

            addedAt:
                Date.now()

        });

        console.log(

            "Playlist size:",

            this.playlist.size()

        );

        if (wasEmpty) {

            await this.player.openVideo(
                command.item.videoId
            );

        }

    }

}