import { CommandType } from "./CommandType";
import type { PlaylistItemPayload } from "../types/PlaylistItemPayload";

export interface CommandPayload {

    type: CommandType;

    agentId?: string;

    videoId?: string;

    volume?: number;

    seek?: number;

    id?: string;

    repeatMode?: string;

    item?: PlaylistItemPayload;

}