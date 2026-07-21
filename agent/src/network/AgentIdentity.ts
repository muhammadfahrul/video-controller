import { config } from "../config/config";


export interface AgentIdentity {


    id:string;


    name:string;


    roomId: string;


    roomName: string;


}

export class AgentIdentityProvider {


    private identity:
        AgentIdentity;



    constructor(){

        this.identity = {

            id:
            `agent-${config.room.id}`,


            name:
            `${config.room.name} Agent`,


            roomId: config.room.id,


            roomName: config.room.name

        };

    }



    get(){

        return this.identity;

    }


}