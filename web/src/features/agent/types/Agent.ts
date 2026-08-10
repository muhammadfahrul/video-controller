export interface Agent {

    id: string;

    name: string;

    status:
        | "ONLINE"
        | "OFFLINE"
        | "WAITING"
        | "PLAYING"
        | "PAUSED";

    lastHeartbeat: number;

    isActive?: boolean;

}