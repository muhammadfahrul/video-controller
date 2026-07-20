"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistManager = void 0;
class PlaylistManager {
    playlist = [];
    add(item) {
        this.playlist.push(item);
    }
    remove(id) {
        this.playlist =
            this.playlist.filter(item => item.id !== id);
    }
    clear() {
        this.playlist = [];
    }
    next() {
        return this.playlist.shift()
            ?? null;
    }
    peek() {
        return this.playlist[0]
            ?? null;
    }
    getAll() {
        return [
            ...this.playlist
        ];
    }
    size() {
        return this.playlist.length;
    }
}
exports.PlaylistManager = PlaylistManager;
