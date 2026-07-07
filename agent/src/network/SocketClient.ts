import { io, Socket } from "socket.io-client";

import {
    AgentIdentity
} from "./AgentIdentity";


import {
    CommandPayload
} from "../commands";

import {
    CommandRouter
} from "./CommandRouter";



export class SocketClient {


    private socket?:
        Socket;

    private commandRouter?:
        CommandRouter;


    constructor(

        private readonly serverUrl:string,

        private readonly identity:AgentIdentity,

        commandRouter:CommandRouter

    ){

        this.commandRouter =
            commandRouter;

    }




    connect(){

        this.socket =
            io(
                this.serverUrl
            );



        this.socket.on(
            "connect",
            ()=>{


                console.log(
                    "Connected to server"
                );



                this.register();


            }
        );



        this.socket.on(
            "command",
            async(command)=>{


                await this.commandRouter
                    ?.handle(command);


            }
        );


    }




    private register(){


        this.socket?.emit(
            "agent:register",
            this.identity
        );


    }





    sendHeartbeat(){


        this.socket?.emit(
            "agent:heartbeat",
            {

                id:
                this.identity.id

            }
        );


    }


}