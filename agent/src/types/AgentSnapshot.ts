import { PlayerSnapshot } from "./PlayerSnapshot";
import { PlaylistSnapshot } from "./PlaylistSnapshot";

export interface AgentSnapshot {

    agentId?: string;

    player: PlayerSnapshot;

    playlist: PlaylistSnapshot;

}