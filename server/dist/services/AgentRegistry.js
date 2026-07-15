"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
class AgentRegistry {
    agents = new Map();
    register(agent) {
        this.agents.set(agent.id, agent);
    }
    updateHeartbeat(id) {
        const agent = this.agents.get(id);
        if (!agent) {
            return;
        }
        agent.lastHeartbeat =
            Date.now();
        if (agent.status === "OFFLINE") {
            agent.status = "ONLINE";
        }
    }
    updateStatus(id, status) {
        const agent = this.agents.get(id);
        if (agent) {
            agent.status =
                status;
        }
    }
    removeBySocket(socketId) {
        for (const [id, agent] of this.agents) {
            if (agent.socketId === socketId) {
                this.agents.delete(id);
            }
        }
    }
    get(id) {
        return this.agents.get(id);
    }
    getAll() {
        return Array.from(this.agents.values());
    }
    updateSnapshot(id, snapshot) {
        const agent = this.agents.get(id);
        if (!agent) {
            return;
        }
        agent.player =
            snapshot.player;
        agent.queue =
            snapshot.queue;
    }
    getPlayerState(id) {
        return this.agents
            .get(id)
            ?.player;
    }
    updatePlayerState(id, player) {
        const agent = this.agents.get(id);
        if (!agent) {
            console.log("Agent not found", id);
            return;
        }
        agent.player =
            player;
    }
}
exports.AgentRegistry = AgentRegistry;
