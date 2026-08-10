import {
    AgentRegistry
} from "./AgentRegistry";

import {
    AgentInfo
} from "../types/Agent";


export class AgentManager {


    private registry:
        AgentRegistry;



    private timer:
        NodeJS.Timeout;


    private statusChangeListeners: Array<(changed: AgentInfo[]) => void> = [];


    constructor(){

        this.registry =
            new AgentRegistry();


        this.timer =
            setInterval(
                ()=>{

                    this.checkHeartbeat();

                },
                5000
            );

    }


    /**
     * Register a callback invoked whenever checkHeartbeat() flips one or
     * more agents to OFFLINE. Used by SocketServer to broadcast agents:update.
     */
    onStatusChange(listener: (changed: AgentInfo[]) => void) {
        this.statusChangeListeners.push(listener);
    }




    getRegistry(){

        return this.registry;

    }






    private checkHeartbeat() {

        const changed = this.registry.markStaleOffline(15000);

        if (changed.length > 0) {

            for (const listener of this.statusChangeListeners) {
                listener(changed);
            }

        }

    }


}