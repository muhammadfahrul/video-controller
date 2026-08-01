import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../../store/appStore";
import { playerCommandService } from "../../../services/player";

export default function ProgressBar() {
    const { player, agent } = useAppStore();
    const [dragValue, setDragValue] = useState<number | null>(null);
    const isDragging = dragValue !== null;

    // While dragging, show drag position; otherwise show server position
    const localValue = isDragging ? dragValue : player.currentTime;

    // Ref to hold latest localValue for use in async callbacks
    const localValueRef = useRef(localValue);
    useEffect(() => {
        localValueRef.current = localValue;
    }, [localValue]);

    const handleChangeEnd = () => {
        const value = localValueRef.current;
        if (agent.online && agent.id && player.duration > 0) {
            playerCommandService.seek(agent.id, value);
        }
        // Small delay before resetting to avoid slider snapping back before server ack
        setTimeout(() => setDragValue(null), 300);
    };

    return (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Posisi video</span>
                {/* Use localValue during drag so time display is realtime, not server-lagged */}
                <span className={`text-slate-200 transition-colors ${isDragging ? "text-teal-300" : ""}`}>
                    {formatTime(localValue)} / {formatTime(player.duration)}
                </span>
            </div>
            <input
                type="range"
                min="0"
                max={player.duration || 0}
                value={localValue}
                disabled={!agent.online || player.duration <= 0}
                onChange={(event) => setDragValue(Number(event.target.value))}
                onMouseUp={handleChangeEnd}
                onTouchEnd={handleChangeEnd}
                onKeyUp={handleChangeEnd}
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
