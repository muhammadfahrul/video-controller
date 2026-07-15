"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayHandler = void 0;
class PlayHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("[PLAY HANDLER]");
        await this.player.play();
    }
}
exports.PlayHandler = PlayHandler;
