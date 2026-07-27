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

            return;

        }

        this.socket = io(env.apiUrl, {

            transports: ["websocket"]

        });

        this.socket.on("connect", () => {

            // Register pending handlers after connection
            this.registerPendingHandlers();

            // Disable initial loading after data is received
            setTimeout(() => {
                useAppStore.getState().setInitialLoading(false);
            }, 1000);

        });

        this.socket.on("disconnect", () => undefined);

    }

    private registerPendingHandlers() {

        for (const handler of this.pendingHandlers) {
            
            const originalCallback = handler.callback;
            
            this.socket?.on(
                handler.event,
                (payload: unknown) => {

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

        // If socket is already connected, register immediately
        if (this.socket?.connected) {
            
            this.socket.on(
                event,
                (payload: T) => {

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

        this.pendingHandlers = this.pendingHandlers.filter(
            (handler) => handler.event !== event
        );

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
