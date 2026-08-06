import { Clapperboard, Wifi, WifiOff } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../store/appStore";

const pageTitles: Record<string, string> = {
    "/": "Remote Karaoke",
    "/playlist": "Daftar Lagu",
    "/search": "Cari Lagu Karaoke",
    "/settings": "Info Perangkat"
};

export default function AppHeader() {
    const location = useLocation();
    const agent = useAppStore((state) => state.agent);
    const title = pageTitles[location.pathname] ?? "Video Controller";

    return (
        <header className="glass-header sticky top-0 z-30 border-b px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-pink-400 to-violet-400 text-white shadow-lg shadow-pink-500/25">
                        <Clapperboard size={21} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-200/80">Video Controller</p>
                        <h1 className="truncate text-base font-semibold text-white sm:text-lg">{title}</h1>
                    </div>
                </div>

                <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${agent.online ? "border-pink-300/25 bg-pink-300/10 text-fuchsia-100" : "border-slate-600/50 bg-slate-800/70 text-slate-300"}`}>
                    {agent.online ? <Wifi size={15} /> : <WifiOff size={15} />}
                    <span className="hidden sm:inline">{agent.online ? (agent.name || "Terhubung") : "Offline"}</span>
                </div>
            </div>
        </header>
    );
}
