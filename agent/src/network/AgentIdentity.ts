import { config } from "../config/config";


export interface AgentIdentity {


    id:string;


    name:string;


    roomId: string;


    roomName: string;


    isActive: boolean;


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


            roomName: config.room.name,


            isActive: false

        };

    }



    get(){

        return this.identity;

    }


    setActive(active: boolean) {

        this.identity.isActive = active;

    }


}