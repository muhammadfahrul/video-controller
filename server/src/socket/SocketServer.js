"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketServer = void 0;
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const SocketEvents_1 = require("./SocketEvents");
const AgentManager_1 = require("../services/AgentManager");
class SocketServer {
    io;
    manager;
    constructor(server, manager) {
        this.manager =
            manager;
        this.io =
            new socket_io_1.Server(server, {
                cors: {
                    origin: "*"
                }
            });
        this.setup();
    }
    setup() {
        this.io.on("connection", socket => {
            console.log("[CONNECT]", socket.id, socket.handshake.query);
            socket.emit("agents:update", this.manager
                .getRegistry()
                .getAll());
            socket.on(SocketEvents_1.SocketEvents.AGENT_REGISTER, data => {
                console.log("Agent register", data);
                const registry = this.manager.getRegistry();
                registry.register({
                    id: data.id,
                    socketId: socket.id,
                    name: data.name,
                    status: "ONLINE",
                    lastHeartbeat: Date.now(),
                    connectedAt: Date.now()
                });
                this.broadcastAgents(registry.getAll());
            });
            socket.on(SocketEvents_1.SocketEvents.AGENT_HEARTBEAT, data => {
                const registry = this.manager.getRegistry();
                registry.updateHeartbeat(data.id);
                this.broadcastAgents(registry.getAll());
            });
            socket.on("disconnect", () => {
                console.log("Socket disconnected", socket.id);
                const registry = this.manager.getRegistry();
                registry.removeBySocket(socket.id);
                this.broadcastAgents(registry.getAll());
            });
            socket.on(SocketEvents_1.SocketEvents.PLAYER_COMMAND, command => {
                console.log("[SERVER] Player Command", command);
                try {
                    this.sendCommand(command.agentId, command);
                }
                catch (err) {
                    console.error(err);
                }
            });
            socket.on(SocketEvents_1.SocketEvents.PLAYER_STATE, (payload) => {
                console.log("[SERVER] Player State", payload);
                const registry = this.manager
                    .getRegistry();
                console.log(JSON.stringify(registry.getAll(), null, 2));
                registry.updateSnapshot(payload.agentId, payload);
                this.io.emit(SocketEvents_1.SocketEvents.PLAYER_UPDATE, payload);
            });
            socket.on(SocketEvents_1.SocketEvents.QUEUE_STATE, (snapshot) => {
                console.log("[SERVER] Queue", snapshot);
                this.io.emit(SocketEvents_1.SocketEvents.QUEUE_UPDATE, snapshot);
            });
        });
    }
    sendCommand(agentId, command) {
        console.log("[SERVER] Send Command", command);
        const agent = this.manager
            .getRegistry()
            .get(agentId);
        if (!agent) {
            throw new Error("Agent offline");
        }
        this.io.to(agent.socketId)
            .emit(SocketEvents_1.SocketEvents.COMMAND, command);
    }
    getAgents() {
        return this.manager
            .getRegistry()
            .getAll();
    }
    getManager() {
        return this.manager;
    }
    getIO() {
        return this.io;
    }
    broadcastAgents(agents) {
        console.log("Broadcast ->", JSON.stringify(agents, null, 2));
        this.io.emit("agents:update", agents);
    }
}
exports.SocketServer = SocketServer;
//# sourceMappingURL=SocketServer.js.map