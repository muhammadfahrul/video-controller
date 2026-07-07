import { CommandHandler } from "./CommandHandler";
import { CommandPayload } from "../CommandPayload";


export class NextHandler
implements CommandHandler {


    async execute(
        command:CommandPayload
    ):Promise<void>{


        console.log(
            "NEXT COMMAND"
        );


    }


}