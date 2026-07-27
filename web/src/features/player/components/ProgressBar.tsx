import { useState } from "react";
import { useAppStore } from "../../../store/appStore";
import { playerCommandService } from "../../../services/player";

export default function ProgressBar() {
    const { player, agent } = useAppStore();
    const [dragValue, setDragValue] = useState<number | null>(null);
    const localValue = dragValue ?? player.currentTime;

    const handleChangeEnd = () => {
        if (agent.online && agent.id && player.duration > 0) {
            playerCommandService.seek(agent.id, localValue);
        }
    };

    return (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Posisi video</span>
                <span className="text-slate-200">{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>
            </div>
            <input
                type="range"
                min="0"
                max={player.duration || 0}
                value={localValue}
                disabled={!agent.online || player.duration <= 0}
                onChange={(event) => setDragValue(Number(event.target.value))}
                onMouseUp={() => { handleChangeEnd(); setDragValue(null); }}
                onTouchEnd={() => { handleChangeEnd(); setDragValue(null); }}
                className="w-full"
                aria-label="Posisi video"
            />
        </section>
    );
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
}
