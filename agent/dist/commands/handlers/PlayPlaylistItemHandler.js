"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayPlaylistItemHandler = void 0;
class PlayPlaylistItemHandler {
    player;
    playlist;
    constructor(player, playlist) {
        this.player = player;
        this.playlist = playlist;
    }
    async execute(command) {
        if (!command.id) {
            throw new Error("Playlist id required");
        }
        const item = await this.playlist.playById(command.id);
        if (!item) {
            console.log("Playlist item not found");
            return;
        }
        await this.player.openVideo(item.videoId);
    }
}
exports.PlayPlaylistItemHandler = PlayPlaylistItemHandler;
