import {
    AgentRegistry
} from "./AgentRegistry";


export class AgentManager {


    private registry:
        AgentRegistry;



    private timer:
        NodeJS.Timeout;



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





    getRegistry(){

        return this.registry;

    }






    private checkHeartbeat() {

        const now = Date.now();

        let changed = false;

        for (const agent of this.registry.getAll()) {

            const diff = now - agent.lastHeartbeat;

            if (
                diff > 15000 &&
                agent.status !== "OFFLINE"
            ) {

                agent.status = "OFFLINE";

                changed = true;

            }

        }

        if (changed) {

            // nanti dipanggil callback

        }

    }


}