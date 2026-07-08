import { io, Socket } from "socket.io-client";

import { env } from "../../config/env";

export class SocketService {

    private socket?: Socket;

    connect() {

        if (this.socket?.connected) {

            return;

        }

        this.socket = io(env.apiUrl, {

            transports: ["websocket"]

        });

        this.socket.on("connect", () => {

            console.log(

                "[Socket] Connected",

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

    }

    on<T>(

        event: string,

        callback: (payload: T) => void

    ) {

        this.socket?.on(

            event,

            callback

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