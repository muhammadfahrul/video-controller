import { Router } from "express";
import { ServiceContainer } from "../container/ServiceContainer";
import os from "os";

const startTime = Date.now();

export function createHealthRouter(container: ServiceContainer) {
    const router = Router();

    router.get("/health", (req, res) => {
        const socketServer = container.getSocketServer();
        const agents = socketServer.getAgents();
        
        const memUsage = process.memoryUsage();
        
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - startTime) / 1000),
            system: {
                platform: os.platform(),
                nodeVersion: process.version,
                cpuCount: os.cpus().length,
                freeMemory: Math.floor(os.freemem() / 1024 / 1024) + " MB",
                totalMemory: Math.floor(os.totalmem() / 1024 / 1024) + " MB"
            },
            process: {
                memory: {
                    rss: Math.floor(memUsage.rss / 1024 / 1024) + " MB",
                    heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024) + " MB",
                    heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024) + " MB"
                },
                uptime: Math.floor(process.uptime()) + "s"
            },
            agents: {
                connected: agents.length,
                list: agents.map(a => ({
                    id: a.id,
                    roomId: a.roomId,
                    roomName: a.roomName,
                    status: a.status,
                    connectedAt: a.connectedAt
                }))
            }
        });
    });

    router.get("/health/live", (req, res) => {
        res.status(200).send("OK");
    });

    router.get("/health/ready", (req, res) => {
        // Check if server is ready (database initialized, etc.)
        const socketServer = container.getSocketServer();
        res.status(200).json({ ready: true, agents: socketServer.getAgents().length });
    });

    return router;
}
