import { CommandHandler } from "./CommandHandler";
import { CommandPayload } from "../CommandPayload";
import { PlayerService } from "../../services/PlayerService";


export class VolumeHandler
implements CommandHandler {


    constructor(
        private readonly player: PlayerService
    ){}



    async execute(
        command: CommandPayload
    ): Promise<void>{


        if(command.volume === undefined){

            return;

        }


        await this.player.volume(
            command.volume
        );


    }

}