"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
class AgentController {
    socket;
    constructor(socket) {
        this.socket = socket;
    }
    list(req, res) {
        res.json(this.socket
            .getAgents());
    }
}
exports.AgentController = AgentController;
