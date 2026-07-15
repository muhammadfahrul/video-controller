import { AgentManager } from "../services/AgentManager";
import { SocketServer } from "../socket/SocketServer";
import { CommandService } from "../services/CommandService";
import { Server as HttpServer } from "http";
export declare class ServiceContainer {
    private readonly agentManager;
    private readonly socketServer;
    private readonly commandService;
    constructor(httpServer: HttpServer);
    getAgentManager(): AgentManager;
    getSocketServer(): SocketServer;
    getCommandService(): CommandService;
}
//# sourceMappingURL=ServiceContainer.d.ts.map