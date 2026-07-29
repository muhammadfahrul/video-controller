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
    DatabaseService
} from "../services/DatabaseService";



export class SocketServer {


    private io:Server;


    private manager:
        AgentManager;


    private readonly billingEnabled: boolean;


    private readonly database: DatabaseService;


    // Track activated rooms - persists even after agent disconnects
    private activatedRooms = new Map<string, boolean>();
    
    // Track room activation timers for auto-expiry
    private roomTimers = new Map<string, NodeJS.Timeout>();
    
    // Warning thresholds in seconds before expiry (broadcast to clients)
    private readonly warningThresholds = [300, 120, 60, 30]; // 5min, 2min, 1min, 30sec



    constructor(
        server: HttpServer,
        manager: AgentManager,
        billingEnabled: boolean = true,
        database?: DatabaseService
    ){

        this.manager =
            manager;

        this.billingEnabled = billingEnabled;

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
                            
                            startTime: null,
                            
                            expiresAt: null

                        });

                        // If room was activated, notify the agent
                        if (initialActive && data.roomId) {
                            this.io.to(socket.id).emit("agent:activation", { isActive: true });
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

                // Cashier room activation/deactivation
                socket.on(
                    SocketEvents.CASHIER_ACTIVATE_ROOM,
                    (data: { 
                        roomId: string; 
                        roomName: string; 
                        durationMinutes?: number; 
                        customerName?: string;
                        customerPhone?: string;
                        customerEmail?: string;
                        customerNote?: string;
                    }) => {
                        console.log("[SERVER] Cashier activates room:", data);
                        
                        // Store activation state - persists across reconnections
                        this.activatedRooms.set(data.roomId, true);
                        
                        const registry = this.manager.getRegistry();
                        // Use ref method for mutation
                        const agent = registry.getByRoomIdRef(data.roomId);
                        
                        // Calculate expiry time if duration is provided
                        const expiresAt = data.durationMinutes 
                            ? Date.now() + (data.durationMinutes * 60 * 1000) 
                            : null;
                        
                        // Prepare customer info object
                        const customerInfo = {
                            customerName: data.customerName,
                            customerPhone: data.customerPhone,
                            customerEmail: data.customerEmail,
                            customerNote: data.customerNote,
                        };
                        
                        if (agent) {
                            agent.isActive = true;
                            agent.expiresAt = expiresAt;
                            agent.startTime = Date.now(); // Store start time
                            // Store customer info
                            Object.assign(agent, customerInfo);
                            
                            // Change status from WAITING to ONLINE when activated
                            if (agent.status === "WAITING") {
                                agent.status = "ONLINE";
                            }
                            // Notify the specific agent with expiry info
                            this.io.to(agent.socketId).emit("agent:activation", { 
                                isActive: true,
                                expiresAt: expiresAt,
                                ...customerInfo
                            });
                            this.broadcastAgents(registry.getAll());
                        } else {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                        }
                        
                        // Set up auto-expiry timer if duration is provided
                        if (data.durationMinutes && data.durationMinutes > 0) {
                            this.setupRoomTimer(data.roomId, data.durationMinutes, agent?.socketId);
                        }
                        
                        // Broadcast activation to all clients
                        const startTime = Date.now();
                        this.io.emit("room:activation", {
                            roomId: data.roomId,
                            roomName: data.roomName,
                            isActive: true,
                            expiresAt: expiresAt,
                            startTime: startTime,
                            ...customerInfo
                        });
                    }
                );

                socket.on(
                    SocketEvents.CASHIER_DEACTIVATE_ROOM,
                    (data: { roomId: string }) => {
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
                            
                            // Clear customer info
                            (agent as any).customerName = undefined;
                            (agent as any).customerPhone = undefined;
                            (agent as any).customerEmail = undefined;
                            (agent as any).customerNote = undefined;
                            
                            // Broadcast deactivation to all clients
                            this.io.emit("room:activation", {
                                roomId: data.roomId,
                                isActive: false,
                                reason: "deactivated"
                            });
                            
                            this.broadcastAgents(registry.getAll());
                        } else {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                        }
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
                            expiresAt: newExpiresAt
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

                // Transaction handlers
                socket.on(
                    SocketEvents.TRANSACTION_SAVE,
                    async (transaction) => {
                        console.log("[SERVER] Saving transaction:", transaction.id);
                        try {
                            await this.database.saveTransaction(transaction);
                            // Broadcast to all connected cashiers
                            this.io.emit(SocketEvents.TRANSACTION_GET, await this.database.getTransactions());
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
                    async () => {
                        console.log("[SERVER] Clearing all transactions");
                        try {
                            await this.database.clearTransactions();
                            this.io.emit(SocketEvents.TRANSACTION_GET, []);
                        } catch (error) {
                            console.error("[SOCKET SERVER] Error clearing transactions:", error);
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
    
    // Set up auto-expiry timer for a room
    private setupRoomTimer(roomId: string, durationMinutes: number, socketId?: string): void {
        // Clear any existing timer for this room
        this.clearRoomTimer(roomId);
        
        const durationMs = durationMinutes * 60 * 1000;
        const expiryTime = Date.now() + durationMs;
        
        console.log(`[SERVER] Setting up auto-expiry timer for room ${roomId}: ${durationMinutes} minutes (expires at ${new Date(expiryTime).toISOString()})`);
        
        // Set up warning timers
        for (const threshold of this.warningThresholds) {
            const warningTime = durationMs - (threshold * 1000);
            if (warningTime > 0) {
                setTimeout(() => {
                    this.sendRoomWarning(roomId, threshold, expiryTime);
                }, warningTime);
            }
        }
        
        // Set up expiry timer
        const timer = setTimeout(() => {
            this.expireRoom(roomId);
        }, durationMs);
        
        this.roomTimers.set(roomId, timer);
    }
    
    // Clear room timer
    private clearRoomTimer(roomId: string): void {
        const existingTimer = this.roomTimers.get(roomId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.roomTimers.delete(roomId);
            console.log(`[SERVER] Cleared timer for room ${roomId}`);
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
    private expireRoom(roomId: string): void {
        console.log(`[SERVER] Room ${roomId} expired - auto-deactivating`);
        
        // Clear the timer reference
        this.roomTimers.delete(roomId);
        
        // Remove activation state
        this.activatedRooms.delete(roomId);
        
        const registry = this.manager.getRegistry();
        // Use ref method for mutation
        const agent = registry.getByRoomIdRef(roomId);
        
        if (agent) {
            agent.isActive = false;
            agent.expiresAt = null;
            
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
            
            this.broadcastAgents(registry.getAll());
        }
        
        // Broadcast deactivation to all clients
        this.io.emit("room:activation", {
            roomId,
            isActive: false,
            reason: "expired"
        });
    }
}