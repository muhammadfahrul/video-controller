import { io, Socket } from "socket.io-client";

import { env } from "../../config/env";

type EventCallback = (payload: unknown) => void;
type ConnectCallback = () => void;

interface PendingHandler {
    event: string;
    callback: EventCallback;
}

export class SocketService {

    private socket?: Socket;
    private pendingHandlers: PendingHandler[] = [];
    private connectCallbacks: ConnectCallback[] = [];

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

            this.connectCallbacks.forEach((cb) => cb());

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

    // Subscribe to the socket's 'connect' event (fires on every connect,
    // including reconnects - same as the raw socket.io 'connect' event).
    // If the socket is already connected at subscribe time (very likely,
    // since main.tsx calls connect() before React ever mounts), fire
    // immediately - otherwise a subscriber that shows up after the initial
    // 'connect' already happened would wait forever for a reconnect that
    // may never come.
    onConnect(callback: ConnectCallback): () => void {

        this.connectCallbacks.push(callback);

        if (this.socket?.connected) {
            callback();
        }

        return () => {
            this.connectCallbacks = this.connectCallbacks.filter((cb) => cb !== callback);
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