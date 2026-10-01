// socketService (the singleton instance) is constructed once in
// ./SocketService.ts - re-exported here, not re-constructed, so this barrel
// never accidentally creates a second instance.
export * from "./SocketService";

export * from "./PlaylistListener";