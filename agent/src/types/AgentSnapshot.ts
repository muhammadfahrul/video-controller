import { PlayerSnapshot } from "./PlayerSnapshot";
import { QueueSnapshot } from "./QueueSnapshot";

export interface AgentSnapshot {

    agentId?: string;

    player: PlayerSnapshot;

    queue: QueueSnapshot;

}