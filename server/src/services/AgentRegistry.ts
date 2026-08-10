import {
    AgentInfo
} from "../types/Agent";


import {
    PlayerState
} from "../types/PlayerState";

import {
    AgentSnapshot
} from "../types/AgentSnapshot";

/**
 * AgentRegistry
 * -------------
 * Penyimpanan agent yg terdaftar di server.
 *
 * Topologi (lihat PRD §1):
 *   - 1 PC Ruangan = 1 server + 1 agent. Tidak ada multi-agent per server dalam
 *     topologi normal.
 *   - Sebelumnya: key registry = 'agent.id' (mis. "agent-room-002").
 *   - Sekarang: primary key = 'roomId' (mis. "room-002"). Lebih natural karena:
 *       * 'roomId' stabil (tidak rebuilt tiap restart agent).
 *       * Tidak akan konflik walau ada multiple agent slots per server.
 *
 * Untuk backward-compatibility, semua method menerima string apapun (roomId / agent.id)
 * dan akan di-resolve ke roomId via secondary index `agentIdIndex`.
 */
export class AgentRegistry {

    // Primary store: key = roomId
    private agents =
        new Map<string, AgentInfo>();

    // Secondary index: agent.id -> roomId (untuk backward-compat lookup)
    private agentIdIndex = new Map<string, string>();

    /**
     * Resolve key apapun (roomId / agent.id) jadi roomId yg ada di registry.
     * Return null kalau tidak ketemu.
     */
    private resolveRoomId(key: string | undefined | null): string | null {
        if (!key) return null;

        // Direct roomId match
        if (this.agents.has(key)) return key;

        // Fallback by agent.id
        const mappedRoomId = this.agentIdIndex.get(key);
        if (mappedRoomId && this.agents.has(mappedRoomId)) return mappedRoomId;

        return null;
    }

    register(agent: AgentInfo) {
        const key = agent.roomId || agent.id;
        if (!key) {
            console.error('[Registry] Agent has no roomId or id:', agent);
            return;
        }

        // Replace previous agent untuk roomId yg sama
        if (this.agents.has(key) && this.agents.get(key)!.id !== agent.id) {
            const old = this.agents.get(key)!;
            this.agentIdIndex.delete(old.id);
            console.log(`[Registry] Replacing existing agent for roomId '${key}'`);
        }

        this.agents.set(key, agent);
        if (agent.id) this.agentIdIndex.set(agent.id, key);
    }

    private getAgentByKey(key: string | undefined | null): AgentInfo | undefined {
        if (!key) return undefined;
        const roomId = this.resolveRoomId(key);
        if (!roomId) return undefined;
        return this.agents.get(roomId);
    }

    private cloneAgent(agent: AgentInfo): AgentInfo {
        return {
            ...agent,
            player: agent.player ? { ...agent.player } : undefined,
            playlist: agent.playlist ? {
                ...agent.playlist,
                items: agent.playlist.items?.map(item => ({ ...item }))
            } : undefined,
        };
    }

    updateHeartbeat(idOrRoomId: string) {
        const agent = this.getAgentByKey(idOrRoomId);
        if (!agent) return;
        agent.lastHeartbeat = Date.now();
        if (agent.status === "OFFLINE") {
            agent.status = "ONLINE";
        }
    }

    updateStatus(idOrRoomId: string, status: AgentInfo["status"]) {
        const agent = this.getAgentByKey(idOrRoomId);
        if (agent) {
            agent.status = status;
        }
    }

    removeBySocket(socketId: string) {
        for (const [roomId, agent] of this.agents.entries()) {
            if (agent.socketId === socketId) {
                this.agents.delete(roomId);
                if (agent.id) this.agentIdIndex.delete(agent.id);
            }
        }
    }

    get(idOrRoomId: string): AgentInfo | undefined {
        const agent = this.getAgentByKey(idOrRoomId);
        if (!agent) return undefined;
        return this.cloneAgent(agent);
    }

    getAll(): AgentInfo[] {
        return Array.from(this.agents.values()).map(a => this.cloneAgent(a)!);
    }

    updateSnapshot(idOrRoomId: string, snapshot: AgentSnapshot) {
        const agent = this.getAgentByKey(idOrRoomId);
        if (!agent) {
            console.log('[Registry] updateSnapshot: agent not found for', idOrRoomId);
            return;
        }
        agent.player = snapshot.player;
        agent.playlist = snapshot.playlist;
    }

    public getPlayerState(idOrRoomId: string): PlayerState | undefined {
        const agent = this.getAgentByKey(idOrRoomId);
        return agent?.player;
    }

    public updatePlayerState(idOrRoomId: string, player: PlayerState) {
        const agent = this.getAgentByKey(idOrRoomId);
        if (!agent) {
            console.log('[Registry] updatePlayerState: agent not found', idOrRoomId);
            return;
        }
        agent.player = player;
    }

    public setActive(idOrRoomId: string, isActive: boolean) {
        const agent = this.getAgentByKey(idOrRoomId);
        if (!agent) {
            return;
        }
        agent.isActive = isActive;
    }

    public getByRoomId(roomId: string): AgentInfo | undefined {
        const agent = this.getAgentByKey(roomId);
        if (!agent) return undefined;
        return this.cloneAgent(agent);
    }

    /**
     * Returns actual reference (not clone) - use only for mutations.
     */
    public getByRoomIdRef(roomId: string): AgentInfo | undefined {
        return this.getAgentByKey(roomId);
    }

    /**
     * Returns actual reference by agent.id - use only for mutations.
     */
    public getRef(id: string): AgentInfo | undefined {
        return this.getAgentByKey(id);
    }

    /**
     * Get agent by socket id (for cleanup/disconnect flows).
     */
    public getBySocket(socketId: string): AgentInfo | undefined {
        for (const agent of this.agents.values()) {
            if (agent.socketId === socketId) return agent;
        }
        return undefined;
    }
}
