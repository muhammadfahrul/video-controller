"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepeatModeHandler = void 0;
class RepeatModeHandler {
    queue;
    mode;
    constructor(queue, mode) {
        this.queue = queue;
        this.mode = mode;
    }
    async execute(command) {
        await this.queue.setRepeatMode(this.mode);
        console.log("Repeat:", this.mode);
    }
}
exports.RepeatModeHandler = RepeatModeHandler;
