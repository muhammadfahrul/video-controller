import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { AgentManager } from "../services/AgentManager";
export declare class SocketServer {
    private io;
    private manager;
    constructor(server: HttpServer, manager: AgentManager);
    private setup;
    sendCommand(agentId: string, command: any): void;
    getAgents(): import("../types/Agent").AgentInfo[];
    getManager(): AgentManager;
    getIO(): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    broadcastAgents(agents: unknown): void;
}
//# sourceMappingURL=SocketServer.d.ts.map