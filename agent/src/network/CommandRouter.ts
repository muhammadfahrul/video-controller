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




    async handle(command: CommandPayload) {

        console.log("=== COMMAND ROUTER ===");
        console.log(command);

        await this.commandService.execute(command);

        console.log("=== COMMAND ROUTER DONE ===");
    }


}