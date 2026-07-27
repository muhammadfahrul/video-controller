import { ListRestart, Repeat, Shuffle, Trash2 } from "lucide-react";
import { playerCommandService } from "../../../services/player";
import { useAppStore } from "../../../store/appStore";

export default function PlaylistToolbar() {
    const { agent, playlist, processing, setProcessing } = useAppStore();
    const disabled = !agent.online || !agent.id;

    const command = (action: "shufflePlaylist" | "clearPlaylist" | "repeat", run: () => void) => {
        if (disabled) return;
        setProcessing(action, true);
        run();
        window.setTimeout(() => setProcessing(action, false), 500);
    };

    const repeatMode = playlist.repeat === "OFF" ? "ALL" : playlist.repeat === "ALL" ? "ONE" : "OFF";
    const repeatLabel = playlist.repeat === "OFF" ? "Ulang: mati" : playlist.repeat === "ALL" ? "Ulang semua" : "Ulang satu";
    const buttonClass = "inline-flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45";

    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 pb-4">
            <button type="button" onClick={() => command("shufflePlaylist", () => playerCommandService.shufflePlaylist(agent.id))} disabled={disabled || processing.shufflePlaylist} className={`${buttonClass} bg-white/[0.07] text-slate-100 hover:bg-white/[0.12]`}>
                <Shuffle size={18} /> {processing.shufflePlaylist ? "Mengacak..." : "Acak"}
            </button>
            <button type="button" onClick={() => command("repeat", () => playerCommandService.repeat(agent.id, repeatMode))} disabled={disabled || processing.repeat} className={`${buttonClass} ${playlist.repeat === "OFF" ? "bg-white/[0.07] text-slate-200 hover:bg-white/[0.12]" : "bg-teal-300/12 text-teal-100"}`}>
                {playlist.repeat === "ONE" ? <ListRestart size={16} /> : <Repeat size={16} />} {processing.repeat ? "Memuat..." : repeatLabel}
            </button>
            <button type="button" onClick={() => command("clearPlaylist", () => playerCommandService.clearPlaylist(agent.id))} disabled={disabled || processing.clearPlaylist} className={`${buttonClass} ml-auto bg-rose-400/10 text-rose-200 hover:bg-rose-400/18`}>
                <Trash2 size={16} /> {processing.clearPlaylist ? "Menghapus..." : "Kosongkan"}
            </button>
        </div>
    );
}
