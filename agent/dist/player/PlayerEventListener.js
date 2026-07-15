"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEventListener = void 0;
class PlayerEventListener {
    callback = null;
    setCallback(callback) {
        this.callback = callback;
    }
    async handle(payload) {
        if (!this.callback) {
            return;
        }
        this.callback(payload);
    }
}
exports.PlayerEventListener = PlayerEventListener;
