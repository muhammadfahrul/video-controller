"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeHandler = void 0;
class VolumeHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("VolumeHandler.execute", command);
        if (command.volume === undefined) {
            return;
        }
        await this.player.volume(command.volume);
    }
}
exports.VolumeHandler = VolumeHandler;
