"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemovePlaylistHandler = void 0;
class RemovePlaylistHandler {
    playlist;
    constructor(playlist) {
        this.playlist = playlist;
    }
    async execute(command) {
        if (!command.id) {
            throw new Error("Playlist id required");
        }
        const removed = await this.playlist.remove(command.id);
        console.log("Removed", removed);
    }
}
exports.RemovePlaylistHandler = RemovePlaylistHandler;
