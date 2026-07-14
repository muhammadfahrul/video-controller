import { useAppStore } from "../store/appStore";
import AgentStatusCard from "../features/agent/components/AgentStatusCard";

export default function SettingsPage() {

    const { agent } = useAppStore();

    return (

        <div className="space-y-6">

            <h2 className="text-lg font-bold">Settings</h2>

            <div className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="font-semibold mb-4">Agent Status</h3>
                <AgentStatusCard
                    agent={{
                        id: agent.id,
                        name: agent.name,
                        status: agent.online ? "ONLINE" : "OFFLINE",
                        lastHeartbeat: agent.lastHeartbeat
                    }}
                />
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="font-semibold mb-4">About</h3>
                <p className="text-sm text-gray-600">
                    Remote Video Player Controller
                </p>
                <p className="text-xs text-gray-400 mt-2">
                    Version 1.0.0
                </p>
            </div>

        </div>

    );

}
