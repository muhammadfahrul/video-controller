import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlaylistService
} from "../../services/PlaylistService";

export class RemovePlaylistHandler
implements CommandHandler {

    constructor(

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

        const removed =
            await this.playlist.remove(
                command.id
            );

        console.log(

            "Removed",

            removed

        );

    }

}