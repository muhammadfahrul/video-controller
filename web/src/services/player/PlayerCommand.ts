export interface PlayerCommand {

    agentId: string;

    type: string;

    volume?: number;

    seek?: number;

    videoId?: string;

    repeatMode?: string;

}