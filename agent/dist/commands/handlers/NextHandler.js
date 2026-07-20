"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextHandler = void 0;
class NextHandler {
    player;
    playlist;
    constructor(player, playlist) {
        this.player = player;
        this.playlist = playlist;
    }
    async execute(command) {
        console.log("NextHandler.execute", command);
        const item = await this.playlist.next();
        if (!item) {
            console.log("Already at last video.");
            return;
        }
        console.log("[PLAYLIST] Next:", item.title, item.videoId);
        await this.player.openVideo(item.videoId);
    }
}
exports.NextHandler = NextHandler;
