import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlayerService
} from "../../services/PlayerService";

export class SkipAdHandler
    implements CommandHandler {

    constructor(

        private readonly player:
            PlayerService

    ) {}

    async execute(
        command: CommandPayload
    ) {

        console.log(
            "[SKIP AD HANDLER] Executing skip ad command...",
            command
        );

        try {

            const skipped = await this.player.skipAd();

            console.log(
                "[SKIP AD HANDLER]:",
                skipped ? "Ad skipped successfully" : "No skip button found"
            );

        } catch (error) {

            console.error(
                "[SKIP AD HANDLER] Error:",
                error
            );

        }

    }

}
