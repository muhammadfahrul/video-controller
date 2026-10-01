export interface AgentState {

    id: string;

    name: string;

    online: boolean;

    lastHeartbeat: number;

    // Billing/activation info, mirrors what the server tracks per room.
    isActive: boolean;

    expiresAt: number | null;

}