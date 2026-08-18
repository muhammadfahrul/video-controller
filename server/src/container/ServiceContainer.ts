import { AgentManager } from "../services/AgentManager";

import { SocketServer } from "../socket/SocketServer";

import { CommandService } from "../services/CommandService";

import { DatabaseService } from "../services/DatabaseService";

import { Server as HttpServer } from "http";

import { Package } from "../types/Agent";

export class ServiceContainer {

    private readonly agentManager: AgentManager;

    private readonly socketServer: SocketServer;

    private readonly commandService: CommandService;

    private readonly billingEnabled: boolean;

    private readonly pricePerHour: number;

    private readonly packages: Package[];

    private readonly database: DatabaseService;

    constructor(
        httpServer: HttpServer,
        billingEnabled: boolean = true,
        pricePerHour: number = 50000,
        packages: Package[] = []
    ) {
        this.billingEnabled = billingEnabled;

        this.pricePerHour = pricePerHour;

        this.packages = packages;

        this.database = new DatabaseService();

        this.agentManager =
            new AgentManager();

        this.socketServer =
            new SocketServer(
                httpServer,
                this.agentManager,
                this.billingEnabled,
                this.database,
                this.pricePerHour,
                this.packages
            );

        this.commandService =
            new CommandService(
                this.socketServer
            );

    }

    public async initialize(): Promise<void> {
        await this.database.initialize();
        await this.socketServer.initialize();
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