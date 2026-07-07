export interface AgentIdentity {


    id:string;


    name:string;


}

export class AgentIdentityProvider {


    private identity:
        AgentIdentity;



    constructor(){

        this.identity = {

            id:
            "windows-agent-01",


            name:
            "Windows Player"

        };

    }



    get(){

        return this.identity;

    }


}