"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopHandler = void 0;
class StopHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("StopHandler.execute", command);
        await this.player.stop();
    }
}
exports.StopHandler = StopHandler;
