"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandService = void 0;
class CommandService {
    socket;
    constructor(socket) {
        this.socket = socket;
    }
    send(agentId, command) {
        this.socket.sendCommand(agentId, command);
    }
}
exports.CommandService = CommandService;
