"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
class QueueManager {
    queue = [];
    add(item) {
        this.queue.push(item);
    }
    remove(id) {
        this.queue =
            this.queue.filter(item => item.id !== id);
    }
    clear() {
        this.queue = [];
    }
    next() {
        return this.queue.shift()
            ?? null;
    }
    peek() {
        return this.queue[0]
            ?? null;
    }
    getAll() {
        return [
            ...this.queue
        ];
    }
    size() {
        return this.queue.length;
    }
}
exports.QueueManager = QueueManager;
