import { promises as fs } from "fs";
import path from "path";

export interface PlayerData {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    fullscreen: boolean;
    videoId: string;
}

export interface PlaylistItem {
    id: string;
    videoId: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
    duration?: string;
    addedAt?: number;
}

export interface PlaylistData {
    items: PlaylistItem[];
    currentIndex: number;
    repeat: string;
    shuffle: boolean;
}

export interface AgentData {
    agentId: string;
    player: PlayerData;
    playlist: PlaylistData;
    updatedAt: number;
}

export interface TransactionData {
    id: string;
    roomId: string;
    roomName: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerNote?: string;
    startTime: number;
    endTime: number;
    duration: number;
    pricePerHour: number;
    totalPrice: number;
    paymentMethod?: 'cash' | 'transfer' | 'other';
    paidAt: number;
    notes?: string;
}

interface DatabaseSchema {
    agents: Record<string, AgentData>;
    transactions: TransactionData[];
}

const DEFAULT_DB: DatabaseSchema = {
    agents: {},
    transactions: []
};

export class DatabaseService {
    private readonly dbPath: string;
    private data: DatabaseSchema = DEFAULT_DB;

    constructor(dbDir: string = path.join(process.cwd(), "data")) {
        this.dbPath = path.join(dbDir, "database.json");
    }

    async initialize(): Promise<void> {
        try {
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });
            
            const content = await fs.readFile(this.dbPath, "utf-8");
            this.data = JSON.parse(content);
            console.log("[DATABASE] Loaded existing data");
        } catch {
            // File doesn't exist, use default
            await this.save();
            console.log("[DATABASE] Created new database");
        }
    }

    private async save(): Promise<void> {
        await fs.writeFile(
            this.dbPath,
            JSON.stringify(this.data, null, 2),
            "utf-8"
        );
    }

    // Player methods
    async savePlayer(agentId: string, player: PlayerData): Promise<void> {
        if (!this.data.agents[agentId]) {
            this.data.agents[agentId] = {
                agentId,
                player,
                playlist: { items: [], currentIndex: -1, repeat: "off", shuffle: false },
                updatedAt: Date.now()
            };
        } else {
            this.data.agents[agentId].player = player;
            this.data.agents[agentId].updatedAt = Date.now();
        }
        await this.save();
    }

    async getPlayer(agentId: string): Promise<PlayerData | null> {
        return this.data.agents[agentId]?.player || null;
    }

    // Playlist methods
    async savePlaylist(agentId: string, playlist: PlaylistData): Promise<void> {
        if (!this.data.agents[agentId]) {
            this.data.agents[agentId] = {
                agentId,
                player: {
                    playing: false,
                    currentTime: 0,
                    duration: 0,
                    volume: 100,
                    muted: false,
                    fullscreen: false,
                    videoId: ""
                },
                playlist,
                updatedAt: Date.now()
            };
        } else {
            this.data.agents[agentId].playlist = playlist;
            this.data.agents[agentId].updatedAt = Date.now();
        }
        await this.save();
    }

    async getPlaylist(agentId: string): Promise<PlaylistData | null> {
        return this.data.agents[agentId]?.playlist || null;
    }

    // Get all data for an agent
    async getAgentData(agentId: string): Promise<AgentData | null> {
        return this.data.agents[agentId] || null;
    }

    // Clear agent data
    async clearAgentData(agentId: string): Promise<void> {
        if (this.data.agents[agentId]) {
            this.data.agents[agentId] = {
                agentId,
                player: {
                    playing: false,
                    currentTime: 0,
                    duration: 0,
                    volume: 100,
                    muted: false,
                    fullscreen: false,
                    videoId: ""
                },
                playlist: { items: [], currentIndex: -1, repeat: "off", shuffle: false },
                updatedAt: Date.now()
            };
            await this.save();
        }
    }

    // Transaction methods
    async saveTransaction(transaction: TransactionData): Promise<void> {
        const existingIndex = this.data.transactions.findIndex(t => t.id === transaction.id);
        if (existingIndex >= 0) {
            this.data.transactions[existingIndex] = transaction;
        } else {
            this.data.transactions.unshift(transaction); // Add to beginning
        }
        await this.save();
    }

    async getTransactions(): Promise<TransactionData[]> {
        return this.data.transactions;
    }

    async getTransactionsByRoom(roomId: string): Promise<TransactionData[]> {
        return this.data.transactions.filter(t => t.roomId === roomId);
    }

    async getTransactionsByDateRange(startDate: number, endDate: number): Promise<TransactionData[]> {
        return this.data.transactions.filter(t => t.paidAt >= startDate && t.paidAt <= endDate);
    }

    async deleteTransaction(id: string): Promise<void> {
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        await this.save();
    }

    async clearTransactions(): Promise<void> {
        this.data.transactions = [];
        await this.save();
    }
}
