"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviousHandler = void 0;
class PreviousHandler {
    player;
    playlist;
    constructor(player, playlist) {
        this.player = player;
        this.playlist = playlist;
    }
    async execute(command) {
        console.log("PreviousHandler.execute", command);
        const item = await this.playlist.previous();
        if (!item) {
            console.log("Already at first video.");
            return;
        }
        console.log("[PLAYLIST] Previous:", item.title, item.videoId);
        await this.player.openVideo(item.videoId);
    }
}
exports.PreviousHandler = PreviousHandler;
