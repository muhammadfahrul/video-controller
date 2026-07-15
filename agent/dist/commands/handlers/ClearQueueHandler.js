"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearQueueHandler = void 0;
class ClearQueueHandler {
    queue;
    constructor(queue) {
        this.queue = queue;
    }
    async execute(command) {
        await this.queue.clear();
        console.log("Queue cleared");
    }
}
exports.ClearQueueHandler = ClearQueueHandler;
