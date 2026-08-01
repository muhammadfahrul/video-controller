import type { Agent } from "../types/Agent";
import Card from "../../../shared/components/Card";

interface Props {
    agent: Agent;
    onTriggerAtmosphere?: () => void;
}

export default function AgentStatusCard({ agent, onTriggerAtmosphere }: Props) {
    const online = (agent.status === "ONLINE" || agent.status === "PLAYING") && agent.isActive === true;

    return (
        <Card>
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>🎤</span>
                        <span className="truncate">{agent.name || "Agent Perangkat"}</span>
                    </h2>
                    <p className="mt-1 text-xs break-all font-mono text-slate-400">
                        {agent.id || "ID tidak terdeteksi"}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {onTriggerAtmosphere && online && (
                        <button
                            type="button"
                            onClick={onTriggerAtmosphere}
                            title="Beri Tepuk Tangan ke Agent"
                            className="flex items-center gap-1.5 rounded-xl bg-teal-300/10 px-3 py-1.5 text-xs font-semibold text-teal-200 transition-all hover:bg-teal-300/20 active:scale-95"
                        >
                            <span>👏</span>
                            <span>Tepuk Tangan</span>
                        </button>
                    )}
                    <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-xs font-medium">
                        <div className={`h-2.5 w-2.5 rounded-full ${online ? "bg-teal-300 shadow-[0_0_8px_rgba(244,114,182,0.8)]" : "bg-slate-500"}`} />
                        <span className={online ? "text-teal-200" : "text-slate-400"}>
                            {agent.status || "OFFLINE"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-4 border-t border-white/8 pt-3 flex items-center justify-between text-xs text-slate-400">
                <span>Pembaruan terakhir</span>
                <span className="font-medium text-slate-200">
                    {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleTimeString() : "-"}
                </span>
            </div>
        </Card>
    );
}
