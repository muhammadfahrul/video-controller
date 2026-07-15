"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppContainer = void 0;
const SocketServer_1 = require("../socket/SocketServer");
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
//# sourceMappingURL=AppContainer.js.map