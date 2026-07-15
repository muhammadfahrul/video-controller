import { AgentInfo } from "../types/Agent";
import { PlayerState } from "../types/PlayerState";
import { AgentSnapshot } from "../types/AgentSnapshot";
export declare class AgentRegistry {
    private agents;
    register(agent: AgentInfo): void;
    updateHeartbeat(id: string): void;
    updateStatus(id: string, status: AgentInfo["status"]): void;
    removeBySocket(socketId: string): void;
    get(id: string): AgentInfo | undefined;
    getAll(): AgentInfo[];
    updateSnapshot(id: string, snapshot: AgentSnapshot): void;
    getPlayerState(id: string): PlayerState | undefined;
    updatePlayerState(id: string, player: PlayerState): void;
}
//# sourceMappingURL=AgentRegistry.d.ts.map