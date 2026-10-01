import {
 CommandDispatcher,
 CommandPayload
} from "../commands";


export class CommandService {


    constructor(
        private readonly dispatcher:
            CommandDispatcher
    ){}



    async execute(command: CommandPayload) {

        console.log("=== COMMAND SERVICE ===");

        await this.dispatcher.dispatch(command);

        console.log("=== COMMAND SERVICE DONE ===");
    }


}