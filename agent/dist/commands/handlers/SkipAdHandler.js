"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipAdHandler = void 0;
class SkipAdHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        console.log("[SKIP AD HANDLER] Executing skip ad command...", command);
        try {
            const skipped = await this.player.skipAd();
            console.log("[SKIP AD HANDLER]:", skipped ? "Ad skipped successfully" : "No skip button found");
        }
        catch (error) {
            console.error("[SKIP AD HANDLER] Error:", error);
        }
    }
}
exports.SkipAdHandler = SkipAdHandler;
