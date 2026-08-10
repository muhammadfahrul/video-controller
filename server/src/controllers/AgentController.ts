import {
    Request,
    Response
} from "express";


import {
    SocketServer
} from "../socket/SocketServer";


export class AgentController {


    constructor(
        private readonly socket:
            SocketServer
    ){}




    list(
        req:Request,
        res:Response
    ){


        res.json(

            this.socket
            .getAgents()

        );


    }


}