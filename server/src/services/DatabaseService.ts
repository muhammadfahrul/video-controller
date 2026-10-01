import initSqlJs, { Database } from "sql.js";
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
    packageId?: string | null;
    packageName?: string | null;
    packagePrice?: number | null;
    paymentMethod?: 'cash' | 'transfer' | 'other';
    paidAt: number;
    cleanedAt?: number;
    notes?: string;
}

export interface AgentError {
    id?: number;
    agentId: string;
    roomId: string;
    timestamp: number;
    type: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
}

const DEFAULT_PLAYER: PlayerData = {
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 100,
    muted: false,
    fullscreen: false,
    videoId: ""
};

const DEFAULT_PLAYLIST: PlaylistData = {
    items: [],
    currentIndex: -1,
    repeat: "off",
    shuffle: false
};

export class DatabaseService {
    private readonly dbPath: string;
    private db: Database | null = null;
    private saveTimeout: NodeJS.Timeout | null = null;

    constructor(dbDir: string = path.join(process.cwd(), "data")) {
        this.dbPath = path.join(dbDir, "database.sqlite");
    }

    async initialize(): Promise<void> {
        const dir = path.dirname(this.dbPath);
        await fs.mkdir(dir, { recursive: true });

        const SQL = await initSqlJs();

        try {
            const fileBuffer = await fs.readFile(this.dbPath);
            this.db = new SQL.Database(fileBuffer);
            console.log("[DATABASE] Loaded existing database");
        } catch {
            this.db = new SQL.Database();
            console.log("[DATABASE] Created new database");
        }

        this.createTables();
    }

    private createTables(): void {
        if (!this.db) return;

        // Agents table - stores player and playlist as JSON
        this.db.run(`
            CREATE TABLE IF NOT EXISTS agents (
                agentId TEXT PRIMARY KEY,
                player TEXT NOT NULL,
                playlist TEXT NOT NULL,
                updatedAt INTEGER NOT NULL
            )
        `);

        // Transactions table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                roomId TEXT NOT NULL,
                roomName TEXT NOT NULL,
                customerName TEXT,
                customerPhone TEXT,
                customerEmail TEXT,
                customerNote TEXT,
                startTime INTEGER NOT NULL,
                endTime INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                pricePerHour REAL NOT NULL,
                totalPrice REAL NOT NULL,
                packageId TEXT,
                packageName TEXT,
                packagePrice REAL,
                paymentMethod TEXT,
                paidAt INTEGER DEFAULT 0,
                cleanedAt INTEGER,
                notes TEXT
            )
        `);

        // Migration: Add cleanedAt column if it doesn't exist (for existing databases)
        try {
            this.db.run(`ALTER TABLE transactions ADD COLUMN cleanedAt INTEGER`);
        } catch (e) {
            // Column already exists, ignore
        }

        // Migration: Add package columns if they don't exist (for existing databases)
        try {
            this.db.run(`ALTER TABLE transactions ADD COLUMN packageId TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.run(`ALTER TABLE transactions ADD COLUMN packageName TEXT`);
        } catch (e) {
            // Column already exists, ignore
        }
        try {
            this.db.run(`ALTER TABLE transactions ADD COLUMN packagePrice REAL`);
        } catch (e) {
            // Column already exists, ignore
        }

        // Agent errors table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agentId TEXT NOT NULL,
                roomId TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                stack TEXT,
                context TEXT
            )
        `);

        this.save();
    }

    private save(): void {
        if (!this.db) return;

        // Debounce saves to avoid excessive disk writes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            try {
                const data = this.db!.export();
                const buffer = Buffer.from(data);
                await fs.writeFile(this.dbPath, buffer);
            } catch (error) {
                console.error("[DATABASE] Error saving database:", error);
            }
        }, 100);
    }

    private parsePlayer(row: any): PlayerData {
        try {
            return JSON.parse(row.player);
        } catch {
            return DEFAULT_PLAYER;
        }
    }

    private parsePlaylist(row: any): PlaylistData {
        try {
            return JSON.parse(row.playlist);
        } catch {
            return DEFAULT_PLAYLIST;
        }
    }

    // Player methods
    async savePlayer(agentId: string, player: PlayerData): Promise<void> {
        if (!this.db) return;

        const existing = this.db.exec(`SELECT agentId FROM agents WHERE agentId = ?`, [agentId]);
        
        if (existing.length === 0 || existing[0].values.length === 0) {
            this.db.run(
                `INSERT INTO agents (agentId, player, playlist, updatedAt) VALUES (?, ?, ?, ?)`,
                [agentId, JSON.stringify(player), JSON.stringify(DEFAULT_PLAYLIST), Date.now()]
            );
        } else {
            this.db.run(
                `UPDATE agents SET player = ?, updatedAt = ? WHERE agentId = ?`,
                [JSON.stringify(player), Date.now(), agentId]
            );
        }
        this.save();
    }

    async getPlayer(agentId: string): Promise<PlayerData | null> {
        if (!this.db) return null;

        const result = this.db.exec(`SELECT player FROM agents WHERE agentId = ?`, [agentId]);
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        return this.parsePlayer(result[0].values[0][0]);
    }

    // Playlist methods
    async savePlaylist(agentId: string, playlist: PlaylistData): Promise<void> {
        if (!this.db) return;

        const existing = this.db.exec(`SELECT agentId FROM agents WHERE agentId = ?`, [agentId]);
        
        if (existing.length === 0 || existing[0].values.length === 0) {
            this.db.run(
                `INSERT INTO agents (agentId, player, playlist, updatedAt) VALUES (?, ?, ?, ?)`,
                [agentId, JSON.stringify(DEFAULT_PLAYER), JSON.stringify(playlist), Date.now()]
            );
        } else {
            this.db.run(
                `UPDATE agents SET playlist = ?, updatedAt = ? WHERE agentId = ?`,
                [JSON.stringify(playlist), Date.now(), agentId]
            );
        }
        this.save();
    }

    async getPlaylist(agentId: string): Promise<PlaylistData | null> {
        if (!this.db) return null;

        const result = this.db.exec(`SELECT playlist FROM agents WHERE agentId = ?`, [agentId]);
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }
        return this.parsePlaylist(result[0].values[0][0]);
    }

    // Get all data for an agent
    async getAgentData(agentId: string): Promise<AgentData | null> {
        if (!this.db) return null;

        const result = this.db.exec(
            `SELECT agentId, player, playlist, updatedAt FROM agents WHERE agentId = ?`,
            [agentId]
        );
        if (result.length === 0 || result[0].values.length === 0) {
            return null;
        }

        const row = result[0].values[0];
        return {
            agentId: row[0] as string,
            player: this.parsePlayer({ player: row[1] }),
            playlist: this.parsePlaylist({ playlist: row[2] }),
            updatedAt: row[3] as number
        };
    }

    // Clear agent data
    async clearAgentData(agentId: string): Promise<void> {
        if (!this.db) return;

        this.db.run(
            `UPDATE agents SET player = ?, playlist = ?, updatedAt = ? WHERE agentId = ?`,
            [JSON.stringify(DEFAULT_PLAYER), JSON.stringify(DEFAULT_PLAYLIST), Date.now(), agentId]
        );
        this.save();
    }

    // Transaction methods
    async saveTransaction(transaction: TransactionData): Promise<void> {
        if (!this.db) return;

        const existing = this.db.exec(`SELECT id FROM transactions WHERE id = ?`, [transaction.id]);
        
        if (existing.length > 0 && existing[0].values.length > 0) {
            // Financial/identity fields (roomId, roomName, startTime, endTime,
            // duration, pricePerHour, totalPrice, packageId/Name/Price) are
            // deliberately excluded here. They're set once at creation from
            // server-authoritative data and must never be overwritable by a
            // later client-supplied update (e.g. marking a transaction
            // paid/cleaned) - only the fields below are legitimately mutable
            // after creation.
            this.db.run(`
                UPDATE transactions SET
                    customerName = ?, customerPhone = ?,
                    customerEmail = ?, customerNote = ?,
                    paymentMethod = ?, paidAt = ?, cleanedAt = ?, notes = ?
                WHERE id = ?
            `, [
                transaction.customerName || null,
                transaction.customerPhone || null, transaction.customerEmail || null,
                transaction.customerNote || null,
                transaction.paymentMethod || null, transaction.paidAt, transaction.cleanedAt || null, transaction.notes || null,
                transaction.id
            ]);
        } else {
            this.db.run(`
                INSERT INTO transactions (
                    id, roomId, roomName, customerName, customerPhone, customerEmail,
                    customerNote, startTime, endTime, duration, pricePerHour, totalPrice,
                    packageId, packageName, packagePrice,
                    paymentMethod, paidAt, cleanedAt, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                transaction.id, transaction.roomId, transaction.roomName, transaction.customerName || null,
                transaction.customerPhone || null, transaction.customerEmail || null,
                transaction.customerNote || null, transaction.startTime, transaction.endTime,
                transaction.duration, transaction.pricePerHour, transaction.totalPrice,
                transaction.packageId ?? null, transaction.packageName ?? null, transaction.packagePrice ?? null,
                transaction.paymentMethod || null, transaction.paidAt, transaction.cleanedAt || null, transaction.notes || null
            ]);
        }
        this.save();
    }

    // For client-originated updates only (marking a transaction paid/cleaned,
    // editing customer info). Unlike saveTransaction(), this never inserts -
    // a client can only ever mutate a transaction the server already created
    // via recordTransaction(), never fabricate a brand-new one with an
    // arbitrary totalPrice by emitting an unknown id. Returns false (no-op)
    // if the id doesn't exist.
    async applyClientTransactionUpdate(
        id: string,
        fields: {
            customerName?: string;
            customerPhone?: string;
            customerEmail?: string;
            customerNote?: string;
            paymentMethod?: 'cash' | 'transfer' | 'other';
            paidAt?: number;
            cleanedAt?: number;
            notes?: string;
        }
    ): Promise<boolean> {
        if (!this.db) return false;

        const existing = this.db.exec(`SELECT id, paymentMethod, paidAt, cleanedAt, notes, customerName, customerPhone, customerEmail, customerNote FROM transactions WHERE id = ?`, [id]);

        if (existing.length === 0 || existing[0].values.length === 0) {
            return false;
        }

        const row = existing[0].values[0];
        const current = {
            paymentMethod: row[1] as string | null,
            paidAt: row[2] as number,
            cleanedAt: row[3] as number | null,
            notes: row[4] as string | null,
            customerName: row[5] as string | null,
            customerPhone: row[6] as string | null,
            customerEmail: row[7] as string | null,
            customerNote: row[8] as string | null
        };

        this.db.run(`
            UPDATE transactions SET
                customerName = ?, customerPhone = ?,
                customerEmail = ?, customerNote = ?,
                paymentMethod = ?, paidAt = ?, cleanedAt = ?, notes = ?
            WHERE id = ?
        `, [
            fields.customerName ?? current.customerName,
            fields.customerPhone ?? current.customerPhone,
            fields.customerEmail ?? current.customerEmail,
            fields.customerNote ?? current.customerNote,
            fields.paymentMethod ?? current.paymentMethod,
            fields.paidAt ?? current.paidAt,
            fields.cleanedAt ?? current.cleanedAt,
            fields.notes ?? current.notes,
            id
        ]);

        this.save();
        return true;
    }

    async getTransactions(): Promise<TransactionData[]> {
        if (!this.db) return [];

        const result = this.db.exec(`SELECT * FROM transactions ORDER BY paidAt DESC`);
        if (result.length === 0) return [];

        const columns = result[0].columns;
        return result[0].values.map(row => {
            const obj: any = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj as TransactionData;
        });
    }

    async getTransactionsByRoom(roomId: string): Promise<TransactionData[]> {
        if (!this.db) return [];

        const result = this.db.exec(
            `SELECT * FROM transactions WHERE roomId = ? ORDER BY paidAt DESC`,
            [roomId]
        );
        if (result.length === 0) return [];

        const columns = result[0].columns;
        return result[0].values.map(row => {
            const obj: any = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj as TransactionData;
        });
    }

    async getTransactionsByDateRange(startDate: number, endDate: number): Promise<TransactionData[]> {
        if (!this.db) return [];

        const result = this.db.exec(
            `SELECT * FROM transactions WHERE paidAt >= ? AND paidAt <= ? ORDER BY paidAt DESC`,
            [startDate, endDate]
        );
        if (result.length === 0) return [];

        const columns = result[0].columns;
        return result[0].values.map(row => {
            const obj: any = {};
            columns.forEach((col, idx) => {
                obj[col] = row[idx];
            });
            return obj as TransactionData;
        });
    }

    async deleteTransaction(id: string): Promise<void> {
        if (!this.db) return;

        this.db.run(`DELETE FROM transactions WHERE id = ?`, [id]);
        this.save();
    }

    async clearTransactions(roomId?: string): Promise<void> {
        if (!this.db) return;

        if (roomId) {
            this.db.run(`DELETE FROM transactions WHERE roomId = ?`, [roomId]);
        } else {
            this.db.run(`DELETE FROM transactions`);
        }
        this.save();
    }

    // Error methods
    async saveAgentError(error: AgentError): Promise<void> {
        if (!this.db) return;

        this.db.run(
            `INSERT INTO errors (agentId, roomId, timestamp, type, message, stack, context) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                error.agentId,
                error.roomId,
                error.timestamp,
                error.type,
                error.message,
                error.stack || null,
                error.context ? JSON.stringify(error.context) : null
            ]
        );
        this.save();
    }

    async getAgentErrors(limit: number = 100): Promise<AgentError[]> {
        if (!this.db) return [];

        const result = this.db.exec(
            `SELECT id, agentId, roomId, timestamp, type, message, stack, context FROM errors ORDER BY timestamp DESC LIMIT ?`,
            [limit]
        );
        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            id: row[0] as number,
            agentId: row[1] as string,
            roomId: row[2] as string,
            timestamp: row[3] as number,
            type: row[4] as string,
            message: row[5] as string,
            stack: row[6] as string | undefined,
            context: row[7] ? JSON.parse(row[7] as string) : undefined
        }));
    }

    async clearAgentErrors(): Promise<void> {
        if (!this.db) return;

        this.db.run(`DELETE FROM errors`);
        this.save();
    }
}
