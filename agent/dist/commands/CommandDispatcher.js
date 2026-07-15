"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDispatcher = void 0;
class CommandDispatcher {
    handlers = new Map();
    register(type, handler) {
        this.handlers.set(type, handler);
    }
    async dispatch(command) {
        console.log("Dispatching", command.type);
        const handler = this.handlers.get(command.type);
        if (!handler) {
            throw new Error(`Handler not found ${command.type}`);
        }
        await handler.execute(command);
    }
}
exports.CommandDispatcher = CommandDispatcher;
