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
    AgentRegistry
} from "../services/AgentRegistry";

import {
    AgentManager
} from "../services/AgentManager";



export class SocketServer {


    private io:Server;


    private manager:
        AgentManager;



    constructor(
        server:HttpServer
    ){


        this.io =
            new Server(
                server,
                {

                    cors:{
                        origin:"*"
                    }

                }
            );


        this.manager =
            new AgentManager();



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


                        const agent =
                            this.manager
                            .getRegistry()
                            .updateHeartbeat(
                                data.id
                            );


                        if(agent){

                            agent.lastHeartbeat =
                                Date.now();

                        }


                    }
                );



                socket.on(
                    "disconnect",
                    ()=>{


                        console.log(
                            "Socket disconnected",
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
            this.registry.get(
                agentId
            );


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

    getManager(){

        return this.manager;

    }

    getAgents(){

        return this.manager
            .getRegistry()
            .getAll();

    }
}