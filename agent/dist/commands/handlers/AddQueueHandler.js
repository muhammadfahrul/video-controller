"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddQueueHandler = void 0;
const crypto_1 = require("crypto");
class AddQueueHandler {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async execute(command) {
        if (!command.item) {
            throw new Error("item is required");
        }
        await this.queue.add({
            id: (0, crypto_1.randomUUID)(),
            videoId: command.item.videoId,
            title: command.item.title,
            channel: command.item.channel,
            thumbnail: command.item.thumbnail,
            duration: command.item.duration,
            addedAt: Date.now()
        });
        console.log("Queue size:", this.queue.size());
    }
}
exports.AddQueueHandler = AddQueueHandler;
