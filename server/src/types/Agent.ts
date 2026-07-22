import { PlayerState } from "./PlayerState";
import { PlaylistSnapshot } from "./PlaylistSnapshot";

export type AgentStatus =

    | "ONLINE"

    | "OFFLINE"

    | "PLAYING"

    | "PAUSED"

    | "WAITING"; // Menunggu aktivasi dari cashier

export interface AgentInfo {

    id: string;

    socketId: string;

    name: string;

    roomId: string;

    roomName: string;

    status: AgentStatus;

    lastHeartbeat: number;

    connectedAt: number;

    player?: PlayerState;

    playlist?: PlaylistSnapshot;

    isActive: boolean;

}