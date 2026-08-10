import {
    Request,
    Response
} from "express";


import {
    CommandService
} from "../services/CommandService";


export class CommandController {


    constructor(
        private readonly service:
            CommandService
    ){}



    send(
        req:Request,
        res:Response
    ){


        const {
            agentId,
            command
        } = req.body;



        this.service.send(
            agentId,
            command
        );



        res.json({

            success:true

        });


    }


}