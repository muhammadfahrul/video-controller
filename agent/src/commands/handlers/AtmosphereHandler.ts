import {
    CommandHandler,
    CommandPayload
} from "../index";

import {
    PlayerService
} from "../../services/PlayerService";

export class AtmosphereHandler implements CommandHandler {

    constructor(
        private readonly player: PlayerService
    ) {}

    async execute(command: CommandPayload) {
        console.log(
            "[ATMOSPHERE HANDLER] Executing atmosphere command...",
            command
        );

        try {
            await this.player.triggerAtmosphere();
            console.log("[ATMOSPHERE HANDLER]: Atmosphere effect triggered");
        } catch (error) {
            console.error(
                "[ATMOSPHERE HANDLER] Error:",
                error
            );
        }
    }
}
