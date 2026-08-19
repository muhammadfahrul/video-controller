import {
    Server
} from "socket.io";


import {
    Server as HttpServer
} from "http";


import {
    SocketEvents
} from "./SocketEvents";


import {
    AgentManager
} from "../services/AgentManager";


import {
    DatabaseService,
    TransactionData
} from "../services/DatabaseService";

import {
    AgentInfo,
    Package
} from "../types/Agent";



export class SocketServer {


    private io:Server;


    private manager:
        AgentManager;


    private readonly billingEnabled: boolean;


    private readonly pricePerHour: number;


    private readonly packages: Package[];


    private readonly database: DatabaseService;


    // Track activated rooms - persists even after agent disconnects
    private activatedRooms = new Map<string, boolean>();
    
    // Track room activation timers for auto-expiry (expiry timer + all warning timers)
    private roomTimers = new Map<string, NodeJS.Timeout[]>();
    
    // Warning thresholds in seconds before expiry (broadcast to clients)
    private readonly warningThresholds = [300, 120, 60, 30]; // 5min, 2min, 1min, 30sec



    constructor(
        server: HttpServer,
        manager: AgentManager,
        billingEnabled: boolean = true,
        database?: DatabaseService,
        pricePerHour: number = 50000,
        packages: Package[] = []
    ){

        this.manager =
            manager;

        this.billingEnabled = billingEnabled;

        this.pricePerHour = pricePerHour;

        this.packages = packages;

        // Initialize database if not provided
        this.database = database || new DatabaseService();

        this.io =
            new Server(
                server,
                {

                    cors:{
                        origin:"*"
                    }

                }
            );

        this.setup();

        // Broadcast whenever AgentManager's heartbeat sweep flips an agent OFFLINE
        this.manager.onStatusChange(() => {
            this.broadcastAgents(this.manager.getRegistry().getAll());
        });

    }

    public async initialize(): Promise<void> {
        await this.database.initialize();
        console.log("[SOCKET SERVER] Database initialized");
    }

    private async savePlayerState(agentId: string, player: any): Promise<void> {
        try {
            await this.database.savePlayer(agentId, player);
        } catch (error) {
            console.error("[SOCKET SERVER] Error saving player state:", error);
        }
    }

    private async savePlaylistState(agentId: string, playlist: any): Promise<void> {
        try {
            await this.database.savePlaylist(agentId, playlist);
        } catch (error) {
            console.error("[SOCKET SERVER] Error saving playlist state:", error);
        }
    }

    private async loadAgentData(agentId: string): Promise<{player?: any, playlist?: any} | null> {
        try {
            const data = await this.database.getAgentData(agentId);
            if (data) {
                return {
                    player: data.player,
                    playlist: data.playlist
                };
            }
            return null;
        } catch (error) {
            console.error("[SOCKET SERVER] Error loading agent data:", error);
            return null;
        }
    }

    private async loadAndSendAgentData(socketId: string, agentId: string): Promise<void> {
        const data = await this.loadAgentData(agentId);
        if (data) {
            console.log(`[SOCKET SERVER] Sending saved data to agent ${agentId}`);
            if (data.player) {
                this.io.to(socketId).emit(SocketEvents.PLAYER_STATE, { agentId, player: data.player });
            }
            if (data.playlist) {
                this.io.to(socketId).emit(SocketEvents.PLAYLIST_STATE, data.playlist);
            }
        }
    }



    private setup(){


        this.io.on(
            "connection",
            socket=>{


                console.log(
                    "[CONNECT]",
                    socket.id,
                    socket.handshake.query
                );

                socket.emit(

                    "agents:update",

                    this.manager
                        .getRegistry()
                        .getAll()

                );



                socket.on(
                    SocketEvents.AGENT_REGISTER,
                    data=>{


                        console.log(
                            "Agent register",
                            data
                        );



                        const registry =
                            this.manager.getRegistry();

                        // Check if room was previously activated by cashier (persists across reconnections)
                        const wasActivated = this.activatedRooms.get(data.roomId) === true;

                        // If billing is disabled OR room was already activated, agent is active immediately
                        const initialStatus = (!this.billingEnabled || wasActivated) ? "ONLINE" : "WAITING";
                        const initialActive = !this.billingEnabled || wasActivated;

                        // Re-registration (agent restart / reconnect) must not wipe an
                        // in-progress paid session - carry over the billing/customer
                        // fields from the existing entry instead of resetting them to
                        // null, otherwise every reconnect during an active session
                        // (e.g. right after a Move Room activation) loses the room's
                        // remaining time.
                        const existing = registry.getByRoomIdRef(data.roomId);

                        registry.register({

                            id: data.id,

                            socketId: socket.id,

                            name: data.name,

                            roomId: data.roomId || "",

                            roomName: data.roomName || "",

                            status: initialStatus,

                            lastHeartbeat: Date.now(),

                            connectedAt: Date.now(),

                            isActive: initialActive,

                            pricePerHour: this.pricePerHour,

                            packages: this.packages,

                            startTime: existing?.startTime ?? null,

                            expiresAt: existing?.expiresAt ?? null,

                            needsCleaning: existing?.needsCleaning,

                            lastTransactionEndTime: existing?.lastTransactionEndTime,

                            activePackageId: existing?.activePackageId,

                            packagePrice: existing?.packagePrice,

                            packageDurationMinutes: existing?.packageDurationMinutes,

                            customerName: existing?.customerName,

                            customerPhone: existing?.customerPhone,

                            customerEmail: existing?.customerEmail,

                            customerNote: existing?.customerNote

                        });

                        // If room was activated, notify the agent (include expiresAt so
                        // a reconnecting agent's local watchdog re-syncs to the real
                        // remaining time instead of treating the session as unlimited)
                        if (initialActive && data.roomId) {
                            this.io.to(socket.id).emit("agent:activation", {
                                isActive: true,
                                expiresAt: existing?.expiresAt ?? null
                            });
                        }

                        // Load saved player/playlist data from database and send to agent
                        this.loadAndSendAgentData(socket.id, data.id);

                        this.broadcastAgents(
                            registry.getAll()
                        );


                    }
                );



                socket.on(
                    SocketEvents.AGENT_HEARTBEAT,
                    data=>{


                        const registry =
                            this.manager.getRegistry();

                        registry.updateHeartbeat(
                            data.id
                        );

                        // Also update status - if was WAITING and still not active, keep WAITING
                        // otherwise set to ONLINE
                        // Use ref method for mutation
                        const agent = registry.getRef(data.id);
                        if (agent) {
                            // If agent is waiting and not yet activated, keep as WAITING
                            // Otherwise set to ONLINE
                            if (agent.status === "WAITING" && !agent.isActive) {
                                // Keep as WAITING
                            } else if (agent.status === "OFFLINE") {
                                agent.status = "ONLINE";
                            }
                        }

                        this.broadcastAgents(
                            registry.getAll()
                        );


                    }
                );



                socket.on(
                    "disconnect",
                    ()=>{

                        console.log(
                            "Socket disconnected",
                            socket.id
                        );

                        const registry =
                            this.manager.getRegistry();

                        registry.removeBySocket(
                            socket.id
                        );

                        this.broadcastAgents(
                            registry.getAll()
                        );

                    }
                );


                socket.on(

                    SocketEvents.PLAYER_COMMAND,

                    command => {

                        console.log(

                            "[SERVER] Player Command",

                            command

                        );

                        try {

                            this.sendCommand(

                                command.agentId,

                                command

                            );

                        }

                        catch (err) {

                            console.error(err);

                        }

                    }

                );

                socket.on(

                    SocketEvents.PLAYER_STATE,

                    async (payload)=>{


                        console.log(

                            "[SERVER] Player State",

                            payload

                        );


                        const registry =
                            this.manager
                                .getRegistry();

                        console.log(
                            JSON.stringify(
                                registry.getAll(),
                                null,
                                2
                            )
                        );



                        registry.updateSnapshot(

                            payload.agentId,

                            payload

                        );

                        // Save to database
                        if (payload.agentId && payload.player) {
                            await this.savePlayerState(payload.agentId, payload.player);
                        }

                        this.io.emit(

                            SocketEvents.PLAYER_UPDATE,

                            payload

                        );


                    }

                );

                socket.on(

                    SocketEvents.PLAYLIST_STATE,

                    async (snapshot) => {

                        console.log(

                            "[SERVER] Playlist",

                            snapshot

                        );

                        // Get agentId from socket handshake query
                        const agentId = socket.handshake.query?.agentId as string || snapshot.agentId;
                        
                        // Save to database
                        if (agentId && snapshot) {
                            await this.savePlaylistState(agentId, snapshot);
                        }

                        this.io.emit(

                            SocketEvents.PLAYLIST_UPDATE,

                            snapshot

                        );

                    }

                );



                // Cashier requests agent list (respond only to this socket)
                socket.on(
                    "cashier:request-agents",
                    () => {
                        console.log("[SERVER] Cashier requested agents list");
                        const registry = this.manager.getRegistry();
                        const agents = registry.getAll();
                        console.log("[SERVER] Sending agents:", JSON.stringify(agents));
                        socket.emit("agents:update", agents);
                    }
                );

                // Web client requests current state
                socket.on(
                    "client:request-state",
                    () => {
                        console.log("[SERVER] Client requested state");
                        const registry = this.manager.getRegistry();
                        const agents = registry.getAll();
                        socket.emit("agents:update", agents);
                    }
                );

                // Cashier room activation/deactivation
                socket.on(
                    SocketEvents.CASHIER_ACTIVATE_ROOM,
                    (data: {
                        roomId: string;
                        roomName: string;
                        durationMinutes?: number;
                        packageId?: string;
                        customerName?: string;
                        customerPhone?: string;
                        customerEmail?: string;
                        customerNote?: string;
                        originalStartTime?: number; // carried over from the source room on a Move Room
                        originalExpiresAt?: number; // carried over from the source room on a Move Room
                    }) => {
                        console.log("[SERVER] Cashier activates room:", data);

                        // Store activation state - persists across reconnections
                        this.activatedRooms.set(data.roomId, true);

                        const registry = this.manager.getRegistry();
                        // Use ref method for mutation
                        const agent = registry.getByRoomIdRef(data.roomId);

                        // Look up the package server-side only - never trust price/duration
                        // sent by the client, same principle as the totalPrice fix below.
                        const selectedPackage = data.packageId
                            ? this.packages.find(p => p.id === data.packageId)
                            : undefined;
                        if (data.packageId && !selectedPackage) {
                            console.warn("[SERVER] Unknown packageId, falling back to hourly:", data.packageId);
                        }

                        // Package duration overrides any client-supplied duration.
                        const effectiveDurationMinutes = selectedPackage
                            ? selectedPackage.durationMinutes
                            : data.durationMinutes;

                        // On a Move Room (no package involved), reuse the source room's exact
                        // expiresAt instead of recomputing "now + remaining minutes" - that
                        // recomputation leaked the move's own wall-clock overhead (socket
                        // round-trips, UI delay) into the billed duration and could tip it
                        // over an hour boundary, overbilling the customer. See MoveRoomModal.tsx.
                        const expiresAt = data.originalExpiresAt && !selectedPackage
                            ? data.originalExpiresAt
                            : effectiveDurationMinutes
                                ? Date.now() + (effectiveDurationMinutes * 60 * 1000)
                                : null;

                        // On a Move Room, keep the original session's start time so the
                        // eventual transaction bills the full session once (at this room's
                        // price) instead of double-billing across source + target rooms.
                        const startTime = data.originalStartTime ?? Date.now();

                        // Prepare customer info object
                        const customerInfo = {
                            customerName: data.customerName,
                            customerPhone: data.customerPhone,
                            customerEmail: data.customerEmail,
                            customerNote: data.customerNote,
                        };

                        // Snapshot the package's price/duration onto the session now, so later
                        // edits to server config can't retroactively change an in-progress bill.
                        const packageInfo = {
                            activePackageId: selectedPackage?.id ?? null,
                            packagePrice: selectedPackage?.price ?? null,
                            packageDurationMinutes: selectedPackage?.durationMinutes ?? null,
                        };

                        if (agent) {
                            agent.isActive = true;
                            agent.expiresAt = expiresAt;
                            agent.startTime = startTime;
                            agent.needsCleaning = false;
                            agent.lastTransactionEndTime = null;
                            // Store customer info
                            Object.assign(agent, customerInfo);
                            Object.assign(agent, packageInfo);

                            // Change status from WAITING to ONLINE when activated
                            if (agent.status === "WAITING") {
                                agent.status = "ONLINE";
                            }
                            // Notify the specific agent with expiry info
                            this.io.to(agent.socketId).emit("agent:activation", {
                                isActive: true,
                                expiresAt: expiresAt,
                                serverTime: Date.now(),
                                ...customerInfo,
                                ...packageInfo
                            });
                            this.broadcastAgents(registry.getAll());
                        } else {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                        }

                        // Set up auto-expiry timer sized to the actual time left until
                        // expiresAt (rather than always the full duration) so a carried-over
                        // Move Room expiresAt still fires the timer at the right moment.
                        if (expiresAt) {
                            const remainingMinutes = (expiresAt - Date.now()) / 60000;
                            if (remainingMinutes > 0) {
                                this.setupRoomTimer(data.roomId, remainingMinutes, agent?.socketId);
                            }
                        }

                        // Broadcast activation to all clients
                        this.io.emit("room:activation", {
                            roomId: data.roomId,
                            roomName: data.roomName,
                            isActive: true,
                            expiresAt: expiresAt,
                            startTime: startTime,
                            ...customerInfo,
                            ...packageInfo
                        });
                    }
                );

                socket.on(
                    SocketEvents.CASHIER_DEACTIVATE_ROOM,
                    async (data: { roomId: string; reason?: "manual" | "move" }) => {
                        console.log("[SERVER] Cashier deactivates room:", data);
                        
                        // Clear any existing timer
                        this.clearRoomTimer(data.roomId);
                        
                        // Remove activation state
                        this.activatedRooms.delete(data.roomId);
                        
                        const registry = this.manager.getRegistry();
                        console.log("[SERVER] All registered agents:", Array.from(registry.getAll().map(a => ({ id: a.id, roomId: a.roomId, socketId: a.socketId }))));
                        // Use ref method for mutation
                        const agent = registry.getByRoomIdRef(data.roomId);
                        console.log("[SERVER] Found agent for room:", agent ? { id: agent.id, roomId: agent.roomId, socketId: agent.socketId } : "NOT FOUND");
                        
                        if (agent) {
                            // Capture before overwriting: if the room was already
                            // inactive (e.g. it auto-expired moments ago and this
                            // is a delayed/duplicate deactivate click), the
                            // transaction for that session was already recorded -
                            // skip recording it again below.
                            const wasActive = agent.isActive;

                            agent.isActive = false;
                            console.log("[SERVER] Emitting agent:activation to socketId:", agent.socketId);
                            // Notify the specific agent
                            this.io.to(agent.socketId).emit("agent:activation", { isActive: false });
                            // Clear player and playlist data
                            console.log("[SERVER] Emitting AGENT_CLEAR_DATA to socketId:", agent.socketId);
                            this.io.to(agent.socketId).emit(
                                SocketEvents.AGENT_CLEAR_DATA,
                                {}
                            );
                            
                            // Broadcast empty state to ALL clients (cashier + web PWA)
                            // This ensures web PWA gets cleared state even if agent is disconnected
                            const emptyPlayerState = {
                                player: {
                                    playing: false,
                                    currentTime: 0,
                                    duration: 0,
                                    volume: 100,
                                    muted: false,
                                    fullscreen: false,
                                    videoId: undefined,
                                    title: undefined,
                                    channel: undefined,
                                    thumbnail: undefined
                                },
                                playlist: {
                                    items: [],
                                    currentIndex: -1,
                                    repeat: "off",
                                    shuffle: false
                                }
                            };
                            console.log("[SERVER] Broadcasting empty player state to all clients");
                            this.io.emit(SocketEvents.PLAYER_STATE, emptyPlayerState);
                            this.io.emit(SocketEvents.PLAYLIST_STATE, { items: [], currentIndex: -1, repeat: "off", shuffle: false });
                            
                            // Update registry with empty state to ensure web PWA and API get cleared data
                            registry.updateSnapshot(agent.id, emptyPlayerState);

                            // Clear persisted player/playlist state too, so a reconnecting
                            // agent doesn't get the last real video pushed back to it.
                            try {
                                await this.database.clearAgentData(agent.id);
                            } catch (error) {
                                console.error("[SERVER] Error clearing agent data in DB:", error);
                            }

                            // Room moved out: no transaction is recorded for this room (it's
                            // recorded at the target room instead), so mark it as needing a
                            // physical cleaning check independent of the transaction/payment flow.
                            if (data.reason === "move") {
                                agent.needsCleaning = true;
                                agent.lastTransactionEndTime = Date.now();
                            } else if (wasActive) {
                                // Bill for the full purchased duration (expiresAt), not just
                                // however long actually elapsed before the cashier deactivated.
                                await this.recordTransaction(agent, agent.expiresAt || Date.now());
                            }

                            // Clear customer info
                            (agent as any).customerName = undefined;
                            (agent as any).customerPhone = undefined;
                            (agent as any).customerEmail = undefined;
                            (agent as any).customerNote = undefined;

                            // Clear package info - a moved-out room doesn't carry its
                            // package to whatever session activates this room next.
                            agent.activePackageId = null;
                            agent.packagePrice = null;
                            agent.packageDurationMinutes = null;

                            // Broadcast deactivation to all clients (include expiresAt so cashier can calculate correct duration)
                            this.io.emit("room:activation", {
                                roomId: data.roomId,
                                roomName: agent.roomName,
                                isActive: false,
                                reason: data.reason === "move" ? "move" : "deactivated",
                                expiresAt: agent.expiresAt,
                                startTime: agent.startTime,
                                needsCleaning: agent.needsCleaning,
                                lastTransactionEndTime: agent.lastTransactionEndTime
                            });

                            this.broadcastAgents(registry.getAll());
                        } else {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                        }
                    }
                );

                // Mark a moved-out room as cleaned (room-level, no transaction involved)
                socket.on(
                    SocketEvents.CASHIER_MARK_ROOM_CLEANED,
                    (data: { roomId: string }) => {
                        console.log("[SERVER] Cashier marks room cleaned:", data);

                        const registry = this.manager.getRegistry();
                        const agent = registry.getByRoomIdRef(data.roomId);

                        if (!agent) {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                            return;
                        }

                        agent.needsCleaning = false;
                        agent.lastTransactionEndTime = null;

                        this.broadcastAgents(registry.getAll());
                    }
                );

                // Extend room time
                socket.on(
                    SocketEvents.CASHIER_EXTEND_TIME,
                    (data: { roomId: string; additionalMinutes: number }) => {
                        console.log("[SERVER] Cashier extends room time:", data);
                        
                        const registry = this.manager.getRegistry();
                        // Use ref method for mutation
                        const agent = registry.getByRoomIdRef(data.roomId);
                        
                        if (!agent) {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                            return;
                        }
                        
                        if (!agent.isActive) {
                            console.log("[SERVER] Room is not active:", data.roomId);
                            return;
                        }
                        
                        // Calculate new expiry time
                        const currentExpiresAt = agent.expiresAt || Date.now();
                        const additionalMs = data.additionalMinutes * 60 * 1000;
                        const newExpiresAt = currentExpiresAt + additionalMs;
                        
                        agent.expiresAt = newExpiresAt;
                        
                        console.log("[SERVER] New expiry time:", new Date(newExpiresAt).toISOString());
                        
                        // Reset the auto-expiry timer with the new duration
                        const remainingMs = newExpiresAt - Date.now();
                        const remainingMinutes = remainingMs / 60000; // Keep as float for precision
                        if (remainingMinutes > 0) {
                            this.setupRoomTimer(data.roomId, remainingMinutes, agent.socketId);
                        }
                        
                        // Notify the agent
                        this.io.to(agent.socketId).emit("agent:activation", {
                            isActive: true,
                            expiresAt: newExpiresAt,
                            serverTime: Date.now()
                        });
                        
                        // Broadcast update to all clients
                        this.io.emit("room:activation", {
                            roomId: agent.roomId,
                            roomName: agent.roomName,
                            isActive: true,
                            expiresAt: newExpiresAt,
                            startTime: agent.startTime,
                            customerName: (agent as any).customerName,
                            customerPhone: (agent as any).customerPhone,
                            customerEmail: (agent as any).customerEmail,
                            customerNote: (agent as any).customerNote,
                        });
                        
                        this.broadcastAgents(registry.getAll());
                    }
                );

                // Transaction handlers. Client-originated saves may only update
                // an existing transaction's payment/customer-info fields - they
                // can never create a new transaction or touch its price. New
                // transactions are only ever created server-side, by
                // recordTransaction() when a room session actually ends.
                socket.on(
                    SocketEvents.TRANSACTION_SAVE,
                    async (transaction) => {
                        console.log("[SERVER] Updating transaction:", transaction?.id, "cleanedAt:", transaction?.cleanedAt);
                        try {
                            const updated = await this.database.applyClientTransactionUpdate(transaction.id, {
                                customerName: transaction.customerName,
                                customerPhone: transaction.customerPhone,
                                customerEmail: transaction.customerEmail,
                                customerNote: transaction.customerNote,
                                paymentMethod: transaction.paymentMethod,
                                paidAt: transaction.paidAt,
                                cleanedAt: transaction.cleanedAt,
                                notes: transaction.notes
                            });
                            if (!updated) {
                                console.warn("[SERVER] Ignored transaction:save for unknown id:", transaction?.id);
                                return;
                            }
                            // Broadcast to all connected cashiers
                            const allTransactions = await this.database.getTransactions();
                            console.log("[SERVER] Broadcasting transactions, count:", allTransactions.length);
                            this.io.emit(SocketEvents.TRANSACTION_GET, allTransactions);
                        } catch (error) {
                            console.error("[SOCKET SERVER] Error saving transaction:", error);
                        }
                    }
                );

                socket.on(
                    SocketEvents.TRANSACTION_GET,
                    async () => {
                        console.log("[SERVER] Sending transactions");
                        try {
                            const transactions = await this.database.getTransactions();
                            socket.emit(SocketEvents.TRANSACTION_GET, transactions);
                        } catch (error) {
                            console.error("[SOCKET SERVER] Error getting transactions:", error);
                        }
                    }
                );

                socket.on(
                    SocketEvents.TRANSACTION_DELETE,
                    async (transactionId: string) => {
                        console.log("[SERVER] Deleting transaction:", transactionId);
                        try {
                            await this.database.deleteTransaction(transactionId);
                            this.io.emit(SocketEvents.TRANSACTION_GET, await this.database.getTransactions());
                        } catch (error) {
                            console.error("[SOCKET SERVER] Error deleting transaction:", error);
                        }
                    }
                );

                socket.on(
                    SocketEvents.TRANSACTION_CLEAR,
                    async (data?: { roomId?: string }) => {
                        const roomId = data?.roomId;
                        console.log(roomId
                            ? `[SERVER] Clearing transactions for room ${roomId}`
                            : "[SERVER] Clearing all transactions");
                        try {
                            await this.database.clearTransactions(roomId);
                            this.io.emit(SocketEvents.TRANSACTION_GET, await this.database.getTransactions());
                        } catch (error) {
                            console.error("[SOCKET SERVER] Error clearing transactions:", error);
                        }
                    }
                );

                // Handle agent error reports
                socket.on(
                    SocketEvents.AGENT_ERROR,
                    async (error: {
                        agentId: string;
                        roomId: string;
                        timestamp: number;
                        type: string;
                        message: string;
                        stack?: string;
                        context?: Record<string, unknown>;
                    }) => {
                        console.error("[SERVER] Agent error:", error);
                        // Store error in database for later analysis
                        try {
                            await this.database.saveAgentError(error);
                            // Broadcast error to all connected clients (cashier, web)
                            this.io.emit(SocketEvents.AGENT_ERROR, error);
                        } catch (err) {
                            console.error("[SOCKET SERVER] Error saving agent error:", err);
                        }
                    }
                );


            }
        );


    }



    sendCommand(
        agentId:string,
        command:any
    ){

        console.log(

            "[SERVER] Send Command",

            command

        );

        const agent =
            this.manager
                .getRegistry()
                .get(agentId);


        if(!agent){

            throw new Error(
                "Agent offline"
            );

        }

        // Check if agent is active before sending command
        if (!agent.isActive) {
            console.log("[SERVER] Agent not active, command ignored");
            throw new Error("Agent is not active. Please activate from cashier first.");
        }


        this.io.to(
            agent.socketId
        )
        .emit(
            SocketEvents.COMMAND,
            command
        );


    }

    public getAgents() {
        return this.manager
            .getRegistry()
            .getAll();
    }

    public getManager() {
        return this.manager;
    }

    public getIO() {

        return this.io;

    }

    public broadcastAgents(
        agents: unknown
    ) {

        console.log(
            "Broadcast ->",
            JSON.stringify(
                agents,
                null,
                2
            )
        );

        this.io.emit(
            "agents:update",
            agents
        );

    }
    
    // Compute and persist the transaction for a room session that just ended.
    // This is the single source of truth for duration/totalPrice: the cashier
    // client used to compute these itself and send the finished number over,
    // which meant nothing on the server ever verified it. Billing math now
    // only ever runs here, from agent.startTime/pricePerHour that the server
    // already holds - the client can no longer hand the server a made-up price.
    private async recordTransaction(agent: AgentInfo, endTime: number): Promise<void> {
        const startTime = agent.startTime || 0;
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        if (startTime <= 0 || durationSeconds <= 0) {
            return;
        }

        // Per-block/jam: minimum 1 jam, dibulatkan ke atas - unless this session was
        // started as a fixed-price package, in which case only time beyond the
        // package's included duration is billed hourly on top of the package price.
        let totalPrice: number;
        let packageId: string | null = null;
        let packageName: string | null = null;
        let packagePrice: number | null = null;

        if (agent.packagePrice != null && agent.packageDurationMinutes != null) {
            const packageSeconds = agent.packageDurationMinutes * 60;
            const overageSeconds = Math.max(0, durationSeconds - packageSeconds);
            totalPrice = agent.packagePrice + Math.ceil(overageSeconds / 3600) * agent.pricePerHour;
            packageId = agent.activePackageId ?? null;
            packageName = this.packages.find(p => p.id === packageId)?.name ?? null;
            packagePrice = agent.packagePrice;
        } else {
            totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * agent.pricePerHour);
        }

        const transaction: TransactionData = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
            roomId: agent.roomId,
            roomName: agent.roomName,
            customerName: agent.customerName,
            customerPhone: agent.customerPhone,
            customerEmail: agent.customerEmail,
            customerNote: agent.customerNote,
            startTime,
            endTime,
            duration: durationSeconds,
            pricePerHour: agent.pricePerHour,
            totalPrice,
            packageId,
            packageName,
            packagePrice,
            paidAt: 0
        };

        // Reset package state so the room defaults back to hourly billing
        // next time it's activated, until a package is explicitly chosen again.
        agent.activePackageId = null;
        agent.packagePrice = null;
        agent.packageDurationMinutes = null;

        console.log("[SERVER] Recording transaction:", transaction.id, "room:", transaction.roomId, "totalPrice:", totalPrice);

        try {
            await this.database.saveTransaction(transaction);
            this.io.emit(SocketEvents.TRANSACTION_GET, await this.database.getTransactions());
        } catch (error) {
            console.error("[SERVER] Error recording transaction:", error);
        }
    }

    // Set up auto-expiry timer for a room
    private setupRoomTimer(roomId: string, durationMinutes: number, socketId?: string): void {
        // Clear any existing timer for this room
        this.clearRoomTimer(roomId);
        
        const durationMs = durationMinutes * 60 * 1000;
        const expiryTime = Date.now() + durationMs;
        
        console.log(`[SERVER] Setting up auto-expiry timer for room ${roomId}: ${durationMinutes} minutes (expires at ${new Date(expiryTime).toISOString()})`);

        const timers: NodeJS.Timeout[] = [];

        // Set up warning timers
        for (const threshold of this.warningThresholds) {
            const warningTime = durationMs - (threshold * 1000);
            if (warningTime > 0) {
                timers.push(setTimeout(() => {
                    this.sendRoomWarning(roomId, threshold, expiryTime);
                }, warningTime));
            }
        }

        // Set up expiry timer
        timers.push(setTimeout(() => {
            this.expireRoom(roomId);
        }, durationMs));

        this.roomTimers.set(roomId, timers);
    }

    // Clear all timers (expiry + warnings) for a room
    private clearRoomTimer(roomId: string): void {
        const existingTimers = this.roomTimers.get(roomId);
        if (existingTimers) {
            for (const t of existingTimers) {
                clearTimeout(t);
            }
            this.roomTimers.delete(roomId);
            console.log(`[SERVER] Cleared ${existingTimers.length} timer(s) for room ${roomId}`);
        }
    }
    
    // Send warning before expiry
    private sendRoomWarning(roomId: string, secondsRemaining: number, expiresAt: number): void {
        console.log(`[SERVER] Room ${roomId} will expire in ${secondsRemaining} seconds`);
        
        this.io.emit("room:expiry-warning", {
            roomId,
            secondsRemaining,
            expiresAt
        });
    }
    
    // Expire a room (auto-deactivate)
    private async expireRoom(roomId: string): Promise<void> {
        console.log(`[SERVER] Room ${roomId} expired - auto-deactivating`);
        
        // Clear the timer reference
        this.roomTimers.delete(roomId);
        
        // Remove activation state
        this.activatedRooms.delete(roomId);
        
        const registry = this.manager.getRegistry();
        // Use ref method for mutation
        const agent = registry.getByRoomIdRef(roomId);
        
        // Capture expiry time BEFORE clearing (for broadcast)
        const expiryTime = agent?.expiresAt || Date.now();
        
        if (agent) {
            if (!agent.isActive) {
                // Already deactivated by a concurrent manual deactivate that
                // won the race (e.g. cashier clicked deactivate right as this
                // timer fired) - it already recorded the transaction and did
                // the cleanup below, so bail out to avoid double-billing.
                return;
            }

            // Flip isActive synchronously, before the first await, so a
            // concurrent CASHIER_DEACTIVATE_ROOM handler running interleaved
            // during recordTransaction's awaits can't also record this same
            // session.
            agent.isActive = false;
            agent.expiresAt = null;

            await this.recordTransaction(agent, expiryTime);

            // Notify the specific agent
            this.io.to(agent.socketId).emit("agent:activation", {
                isActive: false,
                reason: "expired"
            });
            
            // Clear player and playlist data
            this.io.to(agent.socketId).emit(SocketEvents.AGENT_CLEAR_DATA, {});
            
            // Broadcast empty state to all clients
            const emptyPlayerState = {
                player: {
                    playing: false,
                    currentTime: 0,
                    duration: 0,
                    volume: 100,
                    muted: false,
                    fullscreen: false,
                    videoId: undefined,
                    title: undefined,
                    channel: undefined,
                    thumbnail: undefined
                },
                playlist: {
                    items: [],
                    currentIndex: -1,
                    repeat: "off",
                    shuffle: false
                }
            };
            
            this.io.emit(SocketEvents.PLAYER_STATE, emptyPlayerState);
            this.io.emit(SocketEvents.PLAYLIST_STATE, { items: [], currentIndex: -1, repeat: "off", shuffle: false });
            registry.updateSnapshot(agent.id, emptyPlayerState);

            try {
                await this.database.clearAgentData(agent.id);
            } catch (error) {
                console.error("[SERVER] Error clearing agent data in DB:", error);
            }

            this.broadcastAgents(registry.getAll());
        }
        
        // Broadcast deactivation to all clients (include expiresAt so cashier can calculate correct duration)
        this.io.emit("room:activation", {
            roomId,
            roomName: agent?.roomName,
            isActive: false,
            reason: "expired",
            expiresAt: expiryTime,
            startTime: agent?.startTime
        });
    }
}