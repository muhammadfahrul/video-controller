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



export class SocketServer {


    private io:Server;


    private manager:
        AgentManager;


    private readonly billingEnabled: boolean;


    // Track activated rooms - persists even after agent disconnects
    private activatedRooms = new Map<string, boolean>();



    constructor(
        server: HttpServer,
        manager: AgentManager,
        billingEnabled: boolean = true
    ){

        this.manager =
            manager;

        this.billingEnabled = billingEnabled;

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

                            isActive: initialActive

                        });

                        // If room was activated, notify the agent
                        if (initialActive && data.roomId) {
                            this.io.to(socket.id).emit("agent:activation", { isActive: true });
                        }

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
                        const agent = registry.get(data.id);
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

                    (payload)=>{


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



                        this.io.emit(

                            SocketEvents.PLAYER_UPDATE,

                            payload

                        );


                    }

                );

                socket.on(

                    SocketEvents.PLAYLIST_STATE,

                    (snapshot) => {

                        console.log(

                            "[SERVER] Playlist",

                            snapshot

                        );

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
                    (data: { roomId: string; roomName: string }) => {
                        console.log("[SERVER] Cashier activates room:", data);
                        
                        // Store activation state - persists across reconnections
                        this.activatedRooms.set(data.roomId, true);
                        
                        const registry = this.manager.getRegistry();
                        const agent = registry.getByRoomId(data.roomId);
                        
                        if (agent) {
                            agent.isActive = true;
                            // Change status from WAITING to ONLINE when activated
                            if (agent.status === "WAITING") {
                                agent.status = "ONLINE";
                            }
                            // Notify the specific agent
                            this.io.to(agent.socketId).emit("agent:activation", { isActive: true });
                            this.broadcastAgents(registry.getAll());
                        } else {
                            console.log("[SERVER] Agent not found for room:", data.roomId);
                        }
                    }
                );

                socket.on(
                    SocketEvents.CASHIER_DEACTIVATE_ROOM,
                    (data: { roomId: string }) => {
                        console.log("[SERVER] Cashier deactivates room:", data);
                        
                        // Remove activation state
                        this.activatedRooms.delete(data.roomId);
                        
                        const registry = this.manager.getRegistry();
                        const agent = registry.getByRoomId(data.roomId);
                        
                        if (agent) {
                            agent.isActive = false;
                            // Notify the specific agent
                            this.io.to(agent.socketId).emit("agent:activation", { isActive: false });
                            // Stop playback when deactivated
                            this.io.to(agent.socketId).emit(
                                SocketEvents.COMMAND,
                                { type: "STOP" }
                            );
                            this.broadcastAgents(registry.getAll());
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
}