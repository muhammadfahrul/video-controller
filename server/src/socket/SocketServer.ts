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



    constructor(
        server: HttpServer,
        manager: AgentManager
    ){

        this.manager =
            manager;

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

                        registry.register({

                            id: data.id,

                            socketId: socket.id,

                            name: data.name,

                            status: "ONLINE",

                            lastHeartbeat: Date.now(),

                            connectedAt: Date.now()

                        });

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

                    (payload) => {

                        const registry =

                            this.manager.getRegistry();

                        const agent =

                            registry
                                .getAll()
                                .find(
                                    item =>
                                        item.socketId === socket.id
                                );

                        if (!agent) {

                            return;

                        }

                        registry.updateSnapshot(
                            agent.id,
                            payload
                        );

                        console.log(
                            "[SERVER] Agent Snapshot",
                            JSON.stringify(
                                registry.get(agent.id),
                                null,
                                2
                            )
                        );

                        this.broadcastAgents(
                            registry.getAll()
                        );

                        this.io.emit(
                            SocketEvents.PLAYER_UPDATE,
                            {
                                agentId: agent.id,
                                ...payload
                            }
                        );

                    }

                );

                socket.on(

                    SocketEvents.QUEUE_STATE,

                    (snapshot) => {

                        console.log(

                            "[SERVER] Queue",

                            snapshot

                        );

                        this.io.emit(

                            SocketEvents.QUEUE_UPDATE,

                            snapshot

                        );

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