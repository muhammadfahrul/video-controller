import {
    Server
} from "socket.io";


import {
    Server as HttpServer
} from "http";


import {
    SocketEvents
} from "./events";


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
                    "Socket connected",
                    socket.id
                );



                socket.on(
                    SocketEvents.AGENT_REGISTER,
                    data=>{


                        console.log(
                            "Agent register",
                            data
                        );



                        this.manager
                        .getRegistry()
                        .register({

                            id:data.id,

                            socketId:socket.id,

                            name:data.name,

                            status:"ONLINE",

                            lastHeartbeat:
                                Date.now(),

                            connectedAt:
                                Date.now()

                        });


                    }
                );



                socket.on(
                    SocketEvents.AGENT_HEARTBEAT,
                    data=>{


                        this.manager
                            .getRegistry()
                            .updateHeartbeat(
                                data.id
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

                        this.manager
                            .getRegistry()
                            .removeBySocket(
                                socket.id
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
}