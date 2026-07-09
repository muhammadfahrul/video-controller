import { io, Socket } from "socket.io-client";

import { env } from "../../config/env";

export class SocketService {

    private socket?: Socket;

    connect() {

        if (this.socket) {

            console.log(
                "[Socket] Already initialized"
            );

            return;

        }

        console.log(
            "[Socket] Creating socket"
        );

        this.socket = io(env.apiUrl, {

            transports: ["websocket"]

        });

        this.socket.on("connect", () => {

            console.log(
                "[Socket] Connected",
            );

            console.log(
                this.socket?.id
            );

        });

        this.socket.on("disconnect", (reason) => {

            console.log(

                "[Socket] Disconnected",

                reason

            );

        });

    }

    disconnect() {

        this.socket?.disconnect();

        this.socket = undefined;
    }

    on<T>(
        event: string,
        callback: (payload: T) => void
    ) {

        console.log(
            "[Socket] Register",
            event
        );

        this.socket?.on(
            event,
            (payload: T) => {

                console.log(
                    "[Socket] Receive",
                    event,
                    payload
                );

                callback(payload);

            }
        );

    }

    off(

        event: string

    ) {

        this.socket?.off(event);

    }

    emit(

        event: string,

        payload?: unknown

    ) {

        this.socket?.emit(

            event,

            payload

        );

    }

    isConnected() {

        return this.socket?.connected ?? false;

    }

}

export const socketService =
    new SocketService();