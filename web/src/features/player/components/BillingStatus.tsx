import { useEffect, useState } from "react";
import { Clock, Infinity as InfinityIcon } from "lucide-react";
import { useAgentState } from "../../../hooks/useAppState";
import { env } from "../../../config/env";
import { socketService } from "../../../services";

function formatRemaining(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function BillingStatus() {

    const agent = useAgentState();
    // Uses the server's clock, not this PC's - a room PC with an unsynced
    // system clock would otherwise show a countdown that's off by exactly
    // that clock's skew from the server, even though expiresAt itself is
    // correct (e.g. a 60min session showing ~105min remaining).
    const [now, setNow] = useState(() => socketService.getServerNow());

    useEffect(() => {
        if (!agent.expiresAt) return;
        const interval = setInterval(() => setNow(socketService.getServerNow()), 1000);
        return () => clearInterval(interval);
    }, [agent.expiresAt]);

    // Billing display is opt-in via VITE_BILLING_ENABLED, and only meaningful
    // once the room is actually online + active (AgentOfflineOverlay covers
    // the offline/inactive case with a full-screen block already).
    if (!env.billingEnabled || !agent.online || !agent.isActive) {
        return null;
    }

    const remainingMs = agent.expiresAt ? agent.expiresAt - now : null;
    const expired = remainingMs !== null && remainingMs <= 0;

    return (
        <div className="rounded-xl bg-[#12121f] p-3 shadow-[0_0_15px_rgba(0,240,255,0.1)] border border-[#2a2a4a] flex items-center justify-between landscape:p-2">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-[#1a1a2e]">
                    {remainingMs === null
                        ? <InfinityIcon size={16} className="text-[#00f0ff]" />
                        : <Clock size={16} className="text-[#00f0ff]" />}
                </div>
                <span className="text-sm text-[#b8b8d0]">
                    {remainingMs === null ? "Sesi Aktif" : "Sisa Waktu"}
                </span>
            </div>
            <span className={`text-lg font-bold tabular-nums ${expired ? "text-[#ff2d95]" : "text-white"}`}>
                {remainingMs === null ? "Tanpa Batas" : formatRemaining(remainingMs)}
            </span>
        </div>
    );
}
