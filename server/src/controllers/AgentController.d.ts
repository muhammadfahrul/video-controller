import { Request, Response } from "express";
import { SocketServer } from "../socket/SocketServer";
export declare class AgentController {
    private readonly socket;
    constructor(socket: SocketServer);
    list(req: Request, res: Response): void;
}
//# sourceMappingURL=AgentController.d.ts.map