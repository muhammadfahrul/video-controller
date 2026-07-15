"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppContainer = void 0;
class AppContainer {
    socketServer;
    setSocketServer(socket) {
        this.socketServer = socket;
    }
    getSocketServer() {
        return this.socketServer;
    }
}
exports.AppContainer = AppContainer;
