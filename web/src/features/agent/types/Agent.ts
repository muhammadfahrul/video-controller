export interface Agent {

    id: string;

    name: string;

    status:
        | "ONLINE"
        | "OFFLINE";

    lastHeartbeat: number;

}