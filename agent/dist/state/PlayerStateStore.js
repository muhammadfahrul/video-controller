"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerStateStore = void 0;
class PlayerStateStore {
    state = {
        videoId: null,
        title: null,
        playing: false,
        paused: true,
        ended: false,
        volume: 100,
        muted: false,
        currentTime: 0,
        duration: 0
    };
    get() {
        return this.state;
    }
    update(patch) {
        this.state = {
            ...this.state,
            ...patch
        };
    }
}
exports.PlayerStateStore = PlayerStateStore;
