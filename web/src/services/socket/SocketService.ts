import { io, Socket } from "socket.io-client";

import { env } from "../../config/env";

import { useAppStore } from "../../store/appStore";

type EventCallback = (payload: unknown) => void;

interface PendingHandler {
    event: string;
    callback: EventCallback;
}

export class SocketService {

    private socket?: Socket;
    private pendingHandlers: PendingHandler[] = [];

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

            // Register pending handlers after connection
            this.registerPendingHandlers();

            // Disable initial loading after data is received
            setTimeout(() => {
                useAppStore.getState().setInitialLoading(false);
            }, 1000);

        });

        this.socket.on("disconnect", (reason) => {

            console.log(

                "[Socket] Disconnected",

                reason

            );

        });

    }

    private registerPendingHandlers() {

        for (const handler of this.pendingHandlers) {
            
            console.log(
                "[Socket] Register pending handler:",
                handler.event
            );

            const originalCallback = handler.callback;
            
            this.socket?.on(
                handler.event,
                (payload: unknown) => {

                    console.log(
                        "[Socket] Receive",
                        handler.event,
                        payload
                    );

                    originalCallback(payload);

                }
            );

        }

        this.pendingHandlers = [];

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

        // If socket is already connected, register immediately
        if (this.socket?.connected) {
            
            this.socket.on(
                event,
                (payload: T) => {

                    console.log(
                        "[Socket] Receive",
                        event,
                        payload
                    );
                    // Debug: Log ALL events
                    console.log("[Socket] All events - event:", event, "payload:", payload);
                    callback(payload);

                }
            );

        } else {
            
            // Store handler to register after connection
            this.pendingHandlers.push({
                event,
                callback: callback as EventCallback
            });
            
        }

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