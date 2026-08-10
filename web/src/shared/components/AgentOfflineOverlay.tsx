import { WifiOff, Lock } from "lucide-react";
import { useAppStore } from "../../store/appStore";

export default function AgentOfflineOverlay() {
  const { agent } = useAppStore();

  if (agent.online) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        flex-col
        items-center
        justify-center
        bg-[#0a0a14]/95
        backdrop-blur-sm
        gap-4
      "
    >
      <div className="flex items-center justify-center p-6 rounded-full bg-[#1a1a2e]">
        <WifiOff size={64} className="text-[#ff2d95]" />
      </div>
      
      <h2 className="text-2xl font-bold text-white">
        Agent Offline
      </h2>
      
      <div className="flex items-center gap-2 text-[#b8b8d0]">
        <Lock size={18} />
        <span className="text-center">
          Silakan aktifkan ruangan dari cashier<br />
          untuk menggunakan aplikasi
        </span>
      </div>
      
      <div className="mt-4 px-4 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
        <p className="text-sm text-gray-400">
          Room: <span className="text-white">{agent.name || 'Tidak ada'}</span>
        </p>
      </div>
    </div>
  );
}
