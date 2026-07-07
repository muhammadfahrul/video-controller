import { CommandType } from "./CommandType";

export interface CommandPayload {

    type: CommandType;

    volume?: number;

    seek?: number;

    videoId?: string;

}