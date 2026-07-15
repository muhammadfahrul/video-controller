"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandController = void 0;
class CommandController {
    service;
    constructor(service) {
        this.service = service;
    }
    send(req, res) {
        const { agentId, command } = req.body;
        this.service.send(agentId, command);
        res.json({
            success: true
        });
    }
}
exports.CommandController = CommandController;
