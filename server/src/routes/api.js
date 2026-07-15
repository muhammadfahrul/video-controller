"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = require("express");
const AgentController_1 = require("../controllers/AgentController");
const CommandController_1 = require("../controllers/CommandController");
const SocketServer_1 = require("../socket/SocketServer");
const CommandService_1 = require("../services/CommandService");
const ServiceContainer_1 = require("../container/ServiceContainer");
function createApiRouter(container) {
    const router = (0, express_1.Router)();
    const agentController = new AgentController_1.AgentController(container.getSocketServer());
    const commandService = container.getCommandService();
    const commandController = new CommandController_1.CommandController(commandService);
    router.get("/agents", agentController.list.bind(agentController));
    router.post("/command", commandController.send.bind(commandController));
    return router;
}
//# sourceMappingURL=api.js.map