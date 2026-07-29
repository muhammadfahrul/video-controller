import {
    AgentInfo
} from "../types/Agent";


import {
    PlayerState
} from "../types/PlayerState";

import {
    AgentSnapshot
} from "../types/AgentSnapshot";


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

        const agent = this.agents.get(id);
        
        if (!agent) return undefined;
        
        // Return clone to prevent external modification
        return {
            ...agent,
            player: agent.player ? { ...agent.player } : undefined,
            playlist: agent.playlist ? { ...agent.playlist, items: agent.playlist.items?.map(item => ({ ...item })) } : undefined
        };

    }





    getAll(){

        const agents = Array.from(
            this.agents.values()
        );

        // Return deep clone to prevent external modification
        return agents.map(agent => ({
            ...agent,
            player: agent.player ? { ...agent.player } : undefined,
            playlist: agent.playlist ? { ...agent.playlist, items: agent.playlist.items?.map(item => ({ ...item })) } : undefined
        }));

    }


    updateSnapshot(

        id: string,

        snapshot: AgentSnapshot

    ) {

        const agent =

            this.agents.get(id);

        if (!agent) {

            return;

        }

        agent.player =

            snapshot.player;

        agent.playlist =

            snapshot.playlist;

    }

    public getPlayerState(
        id: string
    ) {

        return this.agents
            .get(id)
            ?.player;

    }

    public updatePlayerState(

        id:string,

        player:PlayerState

    ){

        const agent =
            this.agents.get(id);


        if(!agent){

            console.log(
                "Agent not found",
                id
            );

            return;

        }


        agent.player =
            player;


    }


    public setActive(
        id: string,
        isActive: boolean
    ) {

        const agent = this.agents.get(id);

        if (!agent) {

            return;

        }

        agent.isActive = isActive;

    }


    public getByRoomId(
        roomId: string
    ): AgentInfo | undefined {

        for (const agent of this.agents.values()) {

            if (agent.roomId === roomId) {

                // Return clone to prevent external modification
                return {
                    ...agent,
                    player: agent.player ? { ...agent.player } : undefined,
                    playlist: agent.playlist ? { ...agent.playlist, items: agent.playlist.items?.map(item => ({ ...item })) } : undefined
                };

            }

        }

        return undefined;

    }

    // Internal method that returns the actual reference - use only for mutations
    public getByRoomIdRef(roomId: string): AgentInfo | undefined {
        for (const agent of this.agents.values()) {
            if (agent.roomId === roomId) {
                return agent;
            }
        }
        return undefined;
    }

    // Internal method that returns the actual reference by ID - use only for mutations
    public getRef(id: string): AgentInfo | undefined {
        return this.agents.get(id);
    }
}