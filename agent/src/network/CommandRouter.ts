import { CommandService } from "../services/CommandService";
import { CommandPayload } from "../commands";

export class CommandRouter {

    constructor(
        private readonly commandService: CommandService
    ) {}

    async handle(command: CommandPayload) {
        // Fix #9: removed verbose console.log("=== COMMAND ROUTER ===") that ran on every command
        await this.commandService.execute(command);
    }

}