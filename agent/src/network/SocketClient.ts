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
import { PlayerSnapshot } from "../types/PlayerSnapshot";
import { SocketEvents } from "../socket/SocketEvents";
import { QueueSnapshot } from "../types/QueueSnapshot";

import {

    AgentSnapshot

} from "../types/AgentSnapshot";

export class SocketClient {


    private socket?:
        Socket;

    private commandRouter?:
        CommandRouter;


    constructor(
        private readonly serverUrl: string,
        private readonly identity: AgentIdentity,
        commandRouter: CommandRouter
    ) {

        this.commandRouter = commandRouter;

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
            async (command) => {

                console.log("Received command", command);

                console.log("Router:", this.commandRouter);

                try {

                    await this.commandRouter?.handle(command);

                    console.log("Command finished");

                } catch (err) {

                    console.error("Command error", err);

                }

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

    public sendPlayerState(
        state: AgentSnapshot
    ): void {

        console.log(

            "[Agent Snapshot]",

            state

        );

        this.socket.emit(

            SocketEvents.PLAYER_STATE,

            state

        );

    }


    public sendQueueState(

        snapshot: QueueSnapshot

    ) {

        this.socket.emit(

            SocketEvents.QUEUE_STATE,

            snapshot

        );

    }


}