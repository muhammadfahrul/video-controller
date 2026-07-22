import { useAppStore } from "../store/appStore";
import { useAgent } from "../hooks/useAgent";
import AgentStatusCard from "../features/agent/components/AgentStatusCard";

export default function SettingsPage() {

    // Initialize agent connection and state
    useAgent();

    const { agent } = useAppStore();

    return (

        <div className="space-y-6 landscape:space-y-5">

            <div className="rounded-xl bg-[#12121f] p-4 shadow-[0_0_20px_rgba(255,45,149,0.15)] border border-[#2a2a4a]">
                <h3 className="font-semibold mb-4 text-white">Agent Status</h3>
                <AgentStatusCard
                    agent={{
                        id: agent.id,
                        name: agent.name,
                        status: agent.online ? "ONLINE" : "OFFLINE",
                        lastHeartbeat: agent.lastHeartbeat,
                        isActive: agent.online
                    }}
                />
            </div>

            <div className="rounded-xl bg-[#12121f] p-4 shadow-[0_0_20px_rgba(168,85,247,0.15)] border border-[#2a2a4a]">
                <h3 className="font-semibold mb-4 text-white">About</h3>
                <p className="text-sm text-[#b8b8d0]">
                    🎤 Remote Karaoke Video Player Controller
                </p>
                <p className="text-xs text-[#00f0ff] mt-2">
                    Version 1.0.0
                </p>
            </div>

        </div>

    );

}
