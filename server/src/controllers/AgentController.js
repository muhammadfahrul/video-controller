"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
const express_1 = require("express");
const SocketServer_1 = require("../socket/SocketServer");
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
//# sourceMappingURL=AgentController.js.map