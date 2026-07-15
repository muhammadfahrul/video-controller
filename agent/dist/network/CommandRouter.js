"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRouter = void 0;
class CommandRouter {
    commandService;
    constructor(commandService) {
        this.commandService = commandService;
    }
    async handle(command) {
        console.log("=== COMMAND ROUTER ===");
        console.log(command);
        await this.commandService.execute(command);
        console.log("=== COMMAND ROUTER DONE ===");
    }
}
exports.CommandRouter = CommandRouter;
