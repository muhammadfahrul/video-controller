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

    pricePerHour: number; // Tarif per jam ruangan ini, dari server/.env PRICE_PER_HOUR

    startTime: number | null; // Timestamp when room was activated

    expiresAt: number | null; // Timestamp when room expires (null if no duration set)

    needsCleaning?: boolean; // Room was vacated (e.g. via move) and hasn't been marked cleaned yet

    lastTransactionEndTime?: number | null; // Timestamp when the room was last vacated, used for cleaning status thresholds

}