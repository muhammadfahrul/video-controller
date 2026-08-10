import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlaylistService
} from "../../services/PlaylistService";

export class ShufflePlaylistHandler
implements CommandHandler {

    constructor(

        private readonly playlist:
            PlaylistService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        await this.playlist.shuffle();

        console.log(
            "Playlist shuffled"
        );

    }

}