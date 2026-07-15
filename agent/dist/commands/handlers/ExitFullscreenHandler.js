"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitFullscreenHandler = void 0;
class ExitFullscreenHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("ExitFullscreenHandler.execute");
        await this.player.exitFullscreen();
    }
}
exports.ExitFullscreenHandler = ExitFullscreenHandler;
