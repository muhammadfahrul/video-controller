import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlaylistService
} from "../../services/PlaylistService";

export class MovePlaylistItemHandler
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

        if (
            command.direction !== "up" &&
            command.direction !== "down"
        ) {

            throw new Error(
                "Valid direction required"
            );

        }

        const moved =
            await this.playlist.move(
                command.id,
                command.direction
            );

        console.log(

            "Playlist item moved",

            moved

        );

    }

}
