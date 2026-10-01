import {
    CommandPayload
} from "./CommandPayload";

import {
    CommandType
} from "./CommandType";

import {
    CommandHandler
} from "./handlers/CommandHandler";


export class CommandDispatcher {


    private handlers =
        new Map<
            CommandType,
            CommandHandler
        >();



    register(
        type:CommandType,
        handler:CommandHandler
    ){


        this.handlers.set(
            type,
            handler
        );


    }



    async dispatch(
        command:CommandPayload
    ):Promise<void>{

        console.log(
            "Dispatching",
            command.type
        );
        
        const handler =
            this.handlers.get(
                command.type
            );



        if(!handler){

            throw new Error(
                `Handler not found ${command.type}`
            );

        }



        await handler.execute(
            command
        );


    }


}