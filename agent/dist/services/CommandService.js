"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandService = void 0;
class CommandService {
    dispatcher;
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
    }
    async execute(command) {
        console.log("=== COMMAND SERVICE ===");
        await this.dispatcher.dispatch(command);
        console.log("=== COMMAND SERVICE DONE ===");
    }
}
exports.CommandService = CommandService;
