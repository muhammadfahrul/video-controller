"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenVideoHandler = void 0;
class OpenVideoHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        if (!command.videoId) {
            throw new Error("videoId is required");
        }
        console.log("OpenVideoHandler.execute", command);
        await this.player.openVideo(command.videoId);
    }
}
exports.OpenVideoHandler = OpenVideoHandler;
