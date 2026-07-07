import axios from "axios";

import {
    CommandPayload
} from "./types";

const SERVER =
    "http://localhost:3000/api/command";

export async function sendCommand(
    command: CommandPayload
) {

    const response =
        await axios.post(
            SERVER,
            {

                agentId:
                    "windows-agent-01",

                command

            }
        );

    return response.data;

}