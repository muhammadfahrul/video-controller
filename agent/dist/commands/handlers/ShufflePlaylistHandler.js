"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShufflePlaylistHandler = void 0;
class ShufflePlaylistHandler {
    playlist;
    constructor(playlist) {
        this.playlist = playlist;
    }
    async execute(command) {
        await this.playlist.shuffle();
        console.log("Playlist shuffled");
    }
}
exports.ShufflePlaylistHandler = ShufflePlaylistHandler;
