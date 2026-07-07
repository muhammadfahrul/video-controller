import { CommandHandler } from "./CommandHandler";
import { CommandPayload } from "../CommandPayload";
import { PlayerService } from "../../services/PlayerService";


export class OpenVideoHandler
implements CommandHandler {


    constructor(
        private readonly player: PlayerService
    ){}



    async execute(
        command:CommandPayload
    ):Promise<void>{


        if(!command.videoId){

            return;

        }


        await this.player.open(
            command.videoId
        );


        await this.player.play();


    }


}