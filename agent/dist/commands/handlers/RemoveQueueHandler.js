"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveQueueHandler = void 0;
class RemoveQueueHandler {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async execute(command) {
        if (!command.id) {
            throw new Error("Queue id required");
        }
        const removed = await this.queue.remove(command.id);
        console.log("Removed", removed);
    }
}
exports.RemoveQueueHandler = RemoveQueueHandler;
