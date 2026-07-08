import { CommandHandler } from "./CommandHandler";
import { CommandPayload } from "../CommandPayload";
import { PlayerService } from "../../services/PlayerService";


export class PlayHandler
implements CommandHandler {


    constructor(
        private readonly player: PlayerService
    ){}



    async execute(
        command: CommandPayload
    ):Promise<void>{

        console.log(

            "[PLAY HANDLER]"

        );

        await this.player.play();


    }


}