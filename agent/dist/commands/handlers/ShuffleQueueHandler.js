"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShuffleQueueHandler = void 0;
class ShuffleQueueHandler {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async execute(command) {
        await this.queue.shuffle();
        console.log("Queue shuffled");
    }
}
exports.ShuffleQueueHandler = ShuffleQueueHandler;
