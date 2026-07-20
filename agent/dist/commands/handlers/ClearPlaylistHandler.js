"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearPlaylistHandler = void 0;
class ClearPlaylistHandler {
    playlist;
    constructor(playlist) {
        this.playlist = playlist;
    }
    async execute(command) {
        await this.playlist.clear();
        console.log("Playlist cleared");
    }
}
exports.ClearPlaylistHandler = ClearPlaylistHandler;
