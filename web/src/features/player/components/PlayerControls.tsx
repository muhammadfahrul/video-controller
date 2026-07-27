import { FastForward, Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import ControlButton from "./ControlButton";
import { playerCommandService } from "../../../services";
import { useAppStore } from "../../../store/appStore";

export default function PlayerControls() {
    const { player, agent, processing, setProcessing } = useAppStore();
    const disabled = !agent.online || !agent.id;
    const status = !agent.online ? "Offline" : player.playing ? "Memutar" : "Dijeda";
    const statusColor = !agent.online ? "bg-slate-500" : player.playing ? "bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.8)]" : "bg-cyan-300";

    const command = (action: keyof typeof processing, run: (id: string) => void) => {
        if (disabled) return;
        setProcessing(action, true);
        run(agent.id);
        window.setTimeout(() => setProcessing(action, false), 500);
    };

    return (
        <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-100"><span className={`size-2.5 rounded-full ${statusColor}`} />{status}</span>
                <span className="text-sm text-slate-300">{player.muted ? "Dibisukan" : `Volume ${player.volume}%`}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
                <ControlButton icon={<SkipBack size={22} />} label="Sebelum" onClick={() => command("previous", (id) => playerCommandService.previous(id))} disabled={disabled || processing.previous} loading={processing.previous} />
                <ControlButton icon={player.playing ? <Pause size={22} /> : <Play size={22} />} label={player.playing ? "Jeda" : "Putar"} variant="primary" onClick={() => command(player.playing ? "pause" : "play", (id) => player.playing ? playerCommandService.pause(id) : playerCommandService.play(id))} disabled={disabled || processing.play || processing.pause} loading={processing.play || processing.pause} />
                <ControlButton icon={<Square size={22} />} label="Stop" variant="danger" onClick={() => command("stop", (id) => playerCommandService.stop(id))} disabled={disabled || processing.stop} loading={processing.stop} />
                <ControlButton icon={<SkipForward size={22} />} label="Berikut" onClick={() => command("next", (id) => playerCommandService.next(id))} disabled={disabled || processing.next} loading={processing.next} />
                <ControlButton icon={player.muted ? <VolumeX size={22} /> : <Volume2 size={22} />} label={player.muted ? "Suara" : "Bisu"} onClick={() => command("mute", (id) => player.muted ? playerCommandService.unmute(id) : playerCommandService.mute(id))} disabled={disabled || processing.mute} loading={processing.mute} />
                <ControlButton icon={player.fullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />} label={player.fullscreen ? "Kecilkan" : "Layar penuh"} onClick={() => command("fullscreen", (id) => player.fullscreen ? playerCommandService.exitFullscreen(id) : playerCommandService.fullscreen(id))} disabled={disabled || processing.fullscreen} loading={processing.fullscreen} />
                <ControlButton icon={<FastForward size={22} />} label="Lewati iklan" onClick={() => command("skipAd", (id) => playerCommandService.skipAd(id))} disabled={disabled || processing.skipAd} loading={processing.skipAd} />
            </div>
        </section>
    );
}
