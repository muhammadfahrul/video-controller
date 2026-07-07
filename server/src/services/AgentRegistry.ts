import {
    AgentInfo
} from "../types/Agent";


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



    remove(
        id:string
    ){


        this.agents.delete(
            id
        );


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



}