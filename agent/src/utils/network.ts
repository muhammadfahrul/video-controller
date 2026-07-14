import * as os from "os";

export function getLocalIpAddress(): string {

    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {

        const iface = interfaces[name];

        if (!iface) continue;

        for (const info of iface) {

            if (
                info.family === "IPv4" &&
                !info.internal
            ) {

                return info.address;

            }

        }

    }

    return "127.0.0.1";

}

export function getServerUrl(port: number = 3000): string {

    const ip = getLocalIpAddress();

    return `http://${ip}:${port}`;

}
