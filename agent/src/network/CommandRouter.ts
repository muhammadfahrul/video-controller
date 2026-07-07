import {
    CommandService
} from "../services/CommandService";


import {
    CommandPayload
} from "../commands";



export class CommandRouter {


    constructor(
        private readonly commandService:
            CommandService
    ){}




    async handle(
        command:CommandPayload
    ){


        console.log(
            "Executing command",
            command
        );



        await this.commandService.execute(
            command
        );


    }


}