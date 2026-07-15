"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
class HealthService {
    getStatus() {
        return {
            status: "OK",
            timestamp: Date.now()
        };
    }
}
exports.HealthService = HealthService;
