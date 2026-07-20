import { PlayerState } from "./PlayerState";
import { PlaylistSnapshot } from "./PlaylistSnapshot";

export type AgentStatus =

    | "ONLINE"

    | "OFFLINE"

    | "PLAYING"

    | "PAUSED";

export interface AgentInfo {

    id: string;

    socketId: string;

    name: string;

    status: AgentStatus;

    lastHeartbeat: number;

    connectedAt: number;

    player?: PlayerState;

    playlist?: PlaylistSnapshot;

}