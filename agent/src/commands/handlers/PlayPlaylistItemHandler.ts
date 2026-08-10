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

export class PlayPlaylistItemHandler
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

        if (!command.id) {

            throw new Error(
                "Playlist id required"
            );

        }

        const item =
            await this.playlist.playById(
                command.id
            );

        if (!item) {

            console.log(
                "Playlist item not found"
            );

            return;

        }

        await this.player.openVideo(
            item.videoId
        );

    }

}