import { config } from "../config/config";
import { APP_VERSION } from "../utils/version";


export interface AgentIdentity {


    id:string;


    name:string;


    roomId: string;


    roomName: string;


    isActive: boolean;


    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerNote?: string;
    expiresAt?: number;
    serverTimeOffsetMs?: number;


    version: string;


}

export class AgentIdentityProvider {


    private identity:
        AgentIdentity;



    constructor(){

        this.identity = {

            id:
            `agent-${config.room.id}`,


            name:
            `${config.room.name}`,


            roomId: config.room.id,


            roomName: config.room.name,


            isActive: false,


            version: APP_VERSION

        };

    }



    get(){

        return this.identity;

    }


    setActive(active: boolean, customerName?: string) {

        this.identity.isActive = active;
        if (customerName !== undefined) {
            this.identity.customerName = customerName;
        }

    }


}