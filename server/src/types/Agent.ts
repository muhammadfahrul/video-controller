import { PlayerState } from "./PlayerState";
import { PlaylistSnapshot } from "./PlaylistSnapshot";

export interface Package {

    id: string;

    name: string;

    durationMinutes: number;

    price: number;

}

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

    packages?: Package[]; // Daftar paket tersedia di ruangan ini, dari server/.env PACKAGES

    activePackageId?: string | null; // Paket yang dipilih untuk sesi berjalan saat ini

    packagePrice?: number | null; // Harga tetap paket aktif, di-snapshot saat aktivasi

    packageDurationMinutes?: number | null; // Durasi tetap paket aktif, di-snapshot saat aktivasi

    customerName?: string;

    customerPhone?: string;

    customerEmail?: string;

    customerNote?: string;

}