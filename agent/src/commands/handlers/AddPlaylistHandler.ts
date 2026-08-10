import {
    randomUUID
} from "crypto";

import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlaylistService
} from "../../services/PlaylistService";

export class AddPlaylistHandler
implements CommandHandler {

    constructor(

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

    }

}