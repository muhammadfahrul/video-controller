"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnmuteHandler = void 0;
class UnmuteHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("UnmuteHandler.execute", command);
        await this.player.unmute();
    }
}
exports.UnmuteHandler = UnmuteHandler;
