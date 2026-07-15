import { SocketServer } from "../socket/SocketServer";
export declare class CommandService {
    private readonly socket;
    constructor(socket: SocketServer);
    send(agentId: string, command: any): void;
}
//# sourceMappingURL=CommandService.d.ts.map