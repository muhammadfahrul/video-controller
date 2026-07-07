import { CommandType } from "./CommandType";


export interface CommandPayload {

    type: CommandType;

    videoId?: string;

    volume?: number;

    seek?: number;

}