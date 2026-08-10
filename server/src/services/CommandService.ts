import {
    SocketServer
} from "../socket/SocketServer";


export class CommandService {


    constructor(
        private readonly socket:
            SocketServer
    ){}



    send(
        agentId:string,
        command:any
    ){


        this.socket.sendCommand(
            agentId,
            command
        );


    }


}