import { CommandType } from "./CommandType";
import type { QueueItemPayload } from "../types/QueueItemPayload";

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