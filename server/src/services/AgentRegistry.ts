import {
    AgentInfo
} from "../types/Agent";


import {
    PlayerState
} from "../types/PlayerState";


export class AgentRegistry {


    private agents =
        new Map<string,AgentInfo>();



    register(
        agent:AgentInfo
    ){

        this.agents.set(
            agent.id,
            agent
        );

    }




    updateHeartbeat(
        id:string
    ){


        const agent =
            this.agents.get(id);



        if(!agent){

            return;

        }



        agent.lastHeartbeat =
            Date.now();



        if(agent.status==="OFFLINE"){

            agent.status="ONLINE";

        }


    }





    updateStatus(
        id:string,
        status:AgentInfo["status"]
    ){


        const agent =
            this.agents.get(id);



        if(agent){

            agent.status =
                status;

        }


    }





    removeBySocket(
        socketId:string
    ){


        for(
            const [id,agent]
            of this.agents
        ){


            if(agent.socketId===socketId){


                this.agents.delete(id);


            }


        }


    }




    get(
        id:string
    ){

        return this.agents.get(id);

    }





    getAll(){

        return Array.from(
            this.agents.values()
        );

    }


    updatePlayerState(

        id: string,

        player: PlayerState

    ) {

        const agent =

            this.agents.get(id);

        if (!agent) {

            return;

        }

        agent.player = player;

    }

    public getPlayerState(
        id: string
    ) {

        return this.agents
            .get(id)
            ?.player;

    }
}