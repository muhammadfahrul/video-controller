"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceContainer = void 0;
const AgentManager_1 = require("../services/AgentManager");
const SocketServer_1 = require("../socket/SocketServer");
const CommandService_1 = require("../services/CommandService");
class ServiceContainer {
    agentManager;
    socketServer;
    commandService;
    constructor(httpServer) {
        this.agentManager =
            new AgentManager_1.AgentManager();
        this.socketServer =
            new SocketServer_1.SocketServer(httpServer, this.agentManager);
        this.commandService =
            new CommandService_1.CommandService(this.socketServer);
    }
    getAgentManager() {
        return this.agentManager;
    }
    getSocketServer() {
        return this.socketServer;
    }
    getCommandService() {
        return this.commandService;
    }
}
exports.ServiceContainer = ServiceContainer;
