import { AgentManager } from "../services/AgentManager";

import { SocketServer } from "../socket/SocketServer";

import { CommandService } from "../services/CommandService";

import { Server as HttpServer } from "http";

export class ServiceContainer {

    private readonly agentManager: AgentManager;

    private readonly socketServer: SocketServer;

    private readonly commandService: CommandService;

    constructor(
        httpServer: HttpServer
    ) {

        this.agentManager =
            new AgentManager();

        this.socketServer =
            new SocketServer(
                httpServer,
                this.agentManager
            );

        this.commandService =
            new CommandService(
                this.socketServer
            );

    }

    public getAgentManager() {

        return this.agentManager;

    }

    public getSocketServer() {

        return this.socketServer;

    }

    public getCommandService() {

        return this.commandService;

    }

}