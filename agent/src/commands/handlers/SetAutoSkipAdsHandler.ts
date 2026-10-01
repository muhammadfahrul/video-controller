import { CommandHandler } from "./CommandHandler";
import { CommandPayload } from "../CommandPayload";

export class SetAutoSkipAdsHandler
implements CommandHandler {

    constructor(
        private readonly setEnabled: (enabled: boolean) => void
    ) {}

    async execute(
        command: CommandPayload
    ): Promise<void> {

        if (command.enabled === undefined) {
            return;
        }

        console.log(
            "SetAutoSkipAdsHandler.execute",
            command
        );

        this.setEnabled(command.enabled);

    }

}
