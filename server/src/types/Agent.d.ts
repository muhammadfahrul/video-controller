import { PlayerState } from "./PlayerState";
import { QueueSnapshot } from "./QueueSnapshot";
export type AgentStatus = "ONLINE" | "OFFLINE" | "PLAYING" | "PAUSED";
export interface AgentInfo {
    id: string;
    socketId: string;
    name: string;
    status: AgentStatus;
    lastHeartbeat: number;
    connectedAt: number;
    player?: PlayerState;
    queue?: QueueSnapshot;
}
//# sourceMappingURL=Agent.d.ts.map