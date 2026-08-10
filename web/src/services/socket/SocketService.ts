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

            // Mark as connected
            
            // Register pending handlers after connection
            this.registerPendingHandlers();
            
            // Request current state from server to ensure we have latest data
            this.socket?.emit("client:request-state");

            // Disable initial loading after data is received
            setTimeout(() => {
                useAppStore.getState().setInitialLoading(false);
            }, 1000);

        });

        // Global listener for ALL events to debug what's coming through
        this.socket?.onAny((event, ...args) => {
            console.log("[Socket] ANY event received:", event, args);
        });

        this.socket.on("disconnect", (reason) => {

            console.log(

                "[Socket] Disconnected",

                reason

            );

            // Mark as disconnected

        });

    }

    private registerPendingHandlers() {

        for (const handler of this.pendingHandlers) {

            console.log(
                "[Socket] Register pending handler:",
                handler.event
            );

            // Register the already-wrapped callback directly (it was wrapped
            // once in on()) - wrapping it again here would create a second
            // function reference that on()'s returned unsubscribe could never
            // find/remove via socket.off(event, wrapped).
            this.socket?.on(
                handler.event,
                handler.callback
            );

        }

        this.pendingHandlers = [];

    }

    disconnect() {

        this.socket?.disconnect();

        this.socket = undefined;
    }

    // Returns an unsubscribe function that removes only this specific
    // listener - never use socket.off(event) directly, since that would
    // remove every listener registered for that event name, including ones
    // owned by other, unrelated subscribers.
    on<T>(
        event: string,
        callback: (payload: T) => void
    ): () => void {

        console.log(
            "[Socket] Register",
            event
        );

        const wrapped = (payload: T) => {

            console.log(
                "[Socket] Receive",
                event,
                payload
            );
            callback(payload);

        };

        // If socket is already connected, register immediately
        if (this.socket?.connected) {

            this.socket.on(
                event,
                wrapped as EventCallback
            );

        } else {

            // Store handler to register after connection
            this.pendingHandlers.push({
                event,
                callback: wrapped as EventCallback
            });

        }

        return () => {

            this.socket?.off(event, wrapped as EventCallback);

            this.pendingHandlers = this.pendingHandlers.filter(
                (h) => !(h.event === event && h.callback === wrapped)
            );

        };

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