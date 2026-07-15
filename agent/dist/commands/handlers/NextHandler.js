"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextHandler = void 0;
class NextHandler {
    player;
    queue;
    constructor(player, queue) {
        this.player = player;
        this.queue = queue;
    }
    async execute(command) {
        console.log("NextHandler.execute", command);
        const item = await this.queue.next();
        if (!item) {
            console.log("Already at last video.");
            return;
        }
        console.log("[QUEUE] Next:", item.title, item.videoId);
        await this.player.openVideo(item.videoId);
    }
}
exports.NextHandler = NextHandler;
