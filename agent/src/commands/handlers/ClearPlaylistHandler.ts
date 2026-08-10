import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlaylistService
} from "../../services/PlaylistService";

export class ClearPlaylistHandler
implements CommandHandler {

    constructor(

        private readonly playlist:
            PlaylistService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        await this.playlist.clear();

        console.log(
            "Playlist cleared"
        );

    }

}