import { Request, Response } from "express";
import { CommandService } from "../services/CommandService";
export declare class CommandController {
    private readonly service;
    constructor(service: CommandService);
    send(req: Request, res: Response): void;
}
//# sourceMappingURL=CommandController.d.ts.map