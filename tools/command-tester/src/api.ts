import axios from "axios";

import {
    CommandPayload
} from "./types";

function getServerUrl() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const iface = interfaces[name];
        for (const info of iface) {
            if (info.family === 'IPv4' && !info.internal) {
                return `http://${info.address}:${process.env.PORT || 3000}/api/command`;
            }
        }
    }
    return `http://localhost:${process.env.PORT || 3000}/api/command`;
}

const SERVER = process.env.SERVER_URL || getServerUrl();

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