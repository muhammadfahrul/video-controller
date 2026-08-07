import { WifiOff, Lock } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../../store/appStore";

export default function AgentOfflineOverlay() {
  const { agent, initialLoading } = useAppStore();
  const location = useLocation();

  if (agent.online || initialLoading || location.pathname === "/settings") {
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
        bg-[#090b12]/95
        backdrop-blur-sm
        gap-4
      "
    >
      <div className="flex items-center justify-center p-6 rounded-full bg-white/8 ring-1 ring-white/10">
        <WifiOff size={56} className="text-teal-300" />
      </div>
      
      <h2 className="text-2xl font-bold text-white">
        Ruangan Sedang Offline
      </h2>
      
      <div className="flex items-center gap-2 text-slate-300">
        <Lock size={18} />
        <span className="text-center">
          Aktifkan ruangan dari kasir<br />
          untuk mulai menggunakan kontrol
        </span>
      </div>
      
      <div className="mt-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
        <p className="text-sm text-slate-400">
          Ruangan: <span className="text-white">{agent.name || 'Belum tersedia'}</span>
        </p>
      </div>
    </div>
  );
}
