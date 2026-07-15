"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PauseHandler = void 0;
class PauseHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        await this.player.pause();
    }
}
exports.PauseHandler = PauseHandler;
