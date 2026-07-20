"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPlaylistHandler = void 0;
const crypto_1 = require("crypto");
class AddPlaylistHandler {
    playlist;
    constructor(playlist) {
        this.playlist = playlist;
    }
    async execute(command) {
        if (!command.item) {
            throw new Error("item is required");
        }
        await this.playlist.add({
            id: (0, crypto_1.randomUUID)(),
            videoId: command.item.videoId,
            title: command.item.title,
            channel: command.item.channel,
            thumbnail: command.item.thumbnail,
            duration: command.item.duration,
            addedAt: Date.now()
        });
        console.log("Playlist size:", this.playlist.size());
    }
}
exports.AddPlaylistHandler = AddPlaylistHandler;
