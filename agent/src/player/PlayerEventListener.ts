import { PlayerEventPayload } from "./PlayerEventPayload";


export type PlayerEventCallback =
(
    payload: PlayerEventPayload
)=>void;



export class PlayerEventListener {


    private callback:
        PlayerEventCallback | null = null;



    public setCallback(
        callback: PlayerEventCallback
    ):void{


        this.callback = callback;


    }



    public async handle(
        payload: PlayerEventPayload
    ):Promise<void>{


        if(!this.callback){

            return;

        }


        this.callback(payload);


    }


}