"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleFullscreenHandler = void 0;
class ToggleFullscreenHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("ToggleFullscreenHandler.execute");
        await this.player.toggleFullscreen();
    }
}
exports.ToggleFullscreenHandler = ToggleFullscreenHandler;
