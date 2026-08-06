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

import { PlaylistSnapshot } from "../../types/PlaylistSnapshot";

export class RepeatModeHandler
implements CommandHandler {

    constructor(

        private readonly playlist:
            PlaylistService,

        private readonly mode:
            RepeatMode,

        private readonly onChanged?: (
            snapshot: PlaylistSnapshot
        ) => void

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

        this.onChanged?.(
            this.playlist.getSnapshot()
        );

    }

}