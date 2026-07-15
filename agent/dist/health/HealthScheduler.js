"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthScheduler = void 0;
class HealthScheduler {
    timer;
    start(interval, callback) {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            callback().catch(console.error);
        }, interval);
    }
    stop() {
        if (!this.timer) {
            return;
        }
        clearInterval(this.timer);
        this.timer = undefined;
    }
}
exports.HealthScheduler = HealthScheduler;
