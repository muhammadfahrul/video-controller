"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullscreenHandler = void 0;
class FullscreenHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("FullscreenHandler.execute");
        await this.player.fullscreen();
    }
}
exports.FullscreenHandler = FullscreenHandler;
