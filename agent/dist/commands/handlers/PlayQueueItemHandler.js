"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayQueueItemHandler = void 0;
class PlayQueueItemHandler {
    player;
    queue;
    constructor(player, queue) {
        this.player = player;
        this.queue = queue;
    }
    async execute(command) {
        if (!command.id) {
            throw new Error("Queue id required");
        }
        const item = await this.queue.playById(command.id);
        if (!item) {
            console.log("Queue item not found");
            return;
        }
        await this.player.openVideo(item.videoId);
    }
}
exports.PlayQueueItemHandler = PlayQueueItemHandler;
