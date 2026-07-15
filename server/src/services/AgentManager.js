"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = void 0;
const AgentRegistry_1 = require("./AgentRegistry");
class AgentManager {
    registry;
    timer;
    constructor() {
        this.registry =
            new AgentRegistry_1.AgentRegistry();
        this.timer =
            setInterval(() => {
                this.checkHeartbeat();
            }, 5000);
    }
    getRegistry() {
        return this.registry;
    }
    checkHeartbeat() {
        const now = Date.now();
        let changed = false;
        for (const agent of this.registry.getAll()) {
            const diff = now - agent.lastHeartbeat;
            if (diff > 15000 &&
                agent.status !== "OFFLINE") {
                agent.status = "OFFLINE";
                changed = true;
            }
        }
        if (changed) {
            // nanti dipanggil callback
        }
    }
}
exports.AgentManager = AgentManager;
//# sourceMappingURL=AgentManager.js.map