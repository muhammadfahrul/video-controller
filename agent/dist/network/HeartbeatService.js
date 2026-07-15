"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatService = void 0;
class HeartbeatService {
    socket;
    interval;
    timer;
    constructor(socket, interval = 10000) {
        this.socket = socket;
        this.interval = interval;
    }
    start() {
        this.timer =
            setInterval(() => {
                this.socket
                    .sendHeartbeat();
            }, this.interval);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}
exports.HeartbeatService = HeartbeatService;
