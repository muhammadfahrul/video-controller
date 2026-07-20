"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketClient = void 0;
const socket_io_client_1 = require("socket.io-client");
const SocketEvents_1 = require("../socket/SocketEvents");
class SocketClient {
    serverUrl;
    identity;
    socket;
    commandRouter;
    constructor(serverUrl, identity, commandRouter) {
        this.serverUrl = serverUrl;
        this.identity = identity;
        this.commandRouter = commandRouter;
    }
    connect() {
        this.socket =
            (0, socket_io_client_1.io)(this.serverUrl);
        this.socket.on("connect", () => {
            console.log("Connected to server");
            this.register();
        });
        this.socket.on("command", async (command) => {
            console.log("Received command", command);
            console.log("Router:", this.commandRouter);
            try {
                await this.commandRouter?.handle(command);
                console.log("Command finished");
            }
            catch (err) {
                console.error("Command error", err);
            }
        });
    }
    register() {
        this.socket?.emit("agent:register", this.identity);
    }
    sendHeartbeat() {
        this.socket?.emit("agent:heartbeat", {
            id: this.identity.id
        });
    }
    sendPlayerState(state) {
        console.log("[Agent Snapshot]", state);
        this.socket?.emit(SocketEvents_1.SocketEvents.PLAYER_STATE, state);
    }
    sendPlaylistState(snapshot) {
        this.socket?.emit(SocketEvents_1.SocketEvents.PLAYLIST_STATE, snapshot);
    }
}
exports.SocketClient = SocketClient;
