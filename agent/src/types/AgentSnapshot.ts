import { PlayerSnapshot } from "./PlayerSnapshot";
import { QueueSnapshot } from "./QueueSnapshot";

export interface AgentSnapshot {

    player: PlayerSnapshot;

    queue: QueueSnapshot;

}