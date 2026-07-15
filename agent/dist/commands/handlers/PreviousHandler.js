"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviousHandler = void 0;
class PreviousHandler {
    player;
    queue;
    constructor(player, queue) {
        this.player = player;
        this.queue = queue;
    }
    async execute(command) {
        console.log("PreviousHandler.execute", command);
        const item = await this.queue.previous();
        if (!item) {
            console.log("Already at first video.");
            return;
        }
        console.log("[QUEUE] Previous:", item.title, item.videoId);
        await this.player.openVideo(item.videoId);
    }
}
exports.PreviousHandler = PreviousHandler;
