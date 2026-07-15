"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuteHandler = void 0;
class MuteHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("MuteHandler.execute", command);
        await this.player.mute();
    }
}
exports.MuteHandler = MuteHandler;
