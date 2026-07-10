import { CommandType } from "./CommandType";
import { QueueItemPayload } from "./QueueItemPayload";

export interface CommandPayload {

    type: CommandType;

    agentId?: string;

    videoId?: string;

    volume?: number;

    seek?: number;

    id?: string;

    repeatMode?: string;

    item?: QueueItemPayload;

}