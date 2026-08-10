import { CommandPayload } from "../CommandPayload";


export interface CommandHandler {


    execute(
        command: CommandPayload
    ): Promise<void>;


}