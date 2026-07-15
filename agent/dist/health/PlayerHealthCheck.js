"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerHealthCheck = void 0;
class PlayerHealthCheck {
    player;
    constructor(player) {
        this.player = player;
    }
    async check() {
        try {
            const snapshot = await this.player
                .getVideoSnapshot();
            if (!snapshot.exists) {
                return false;
            }
            if (!snapshot.ready) {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.PlayerHealthCheck = PlayerHealthCheck;
