import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlaylistService
} from "../../services/PlaylistService";

import {
    RepeatMode
} from "../../playlist/RepeatMode";

export class RepeatModeHandler
implements CommandHandler {

    constructor(

        private readonly playlist:
            PlaylistService,

        private readonly mode:
            RepeatMode

    ) {}

    async execute(
        command: CommandPayload
    ) {

        await this.playlist.setRepeatMode(
            this.mode
        );

        console.log(
            "Repeat:",
            this.mode
        );

    }

}