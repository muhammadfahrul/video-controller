import { ListRestart, Repeat, Shuffle, Trash2 } from "lucide-react";
import { playerCommandService } from "../../../services/player";
import { useAppStore } from "../../../store/appStore";

export default function PlaylistToolbar() {
    const { agent, playlist, processing, setProcessing, setPlaylist } = useAppStore();
    const disabled = !agent.online || !agent.id;

    const command = (action: "shufflePlaylist" | "clearPlaylist" | "repeat", run: () => void, onOptimisticUpdate?: () => void) => {
        if (disabled) return;
        
        setProcessing(action, true);
        
        // Apply optimistic update immediately for better UX
        onOptimisticUpdate?.();
        
        // Execute command with error handling callback
        run();
        
        // Reset processing state after a longer timeout to account for network latency
        // Server should send confirmation within 2-3 seconds
        const timeout = window.setTimeout(() => {
            setProcessing(action, false);
        }, 3000);

        // Store timeout for potential cleanup if needed
        (window as any)._commandTimeouts = (window as any)._commandTimeouts || {};
        (window as any)._commandTimeouts[action] = timeout;
    };

    const repeatMode = playlist.repeat === "OFF" ? "ALL" : playlist.repeat === "ALL" ? "ONE" : "OFF";
    const nextRepeatMode = repeatMode === "OFF" ? "OFF" : repeatMode === "ALL" ? "ONE" : "OFF";
    const repeatLabel = playlist.repeat === "OFF" ? "Ulang: mati" : playlist.repeat === "ALL" ? "Ulang semua" : "Ulang satu";
    const buttonClass = "inline-flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45";

    const handleRepeatClick = () => {
        const nextMode = repeatMode === "OFF" ? "ALL" : repeatMode === "ALL" ? "ONE" : "OFF";
        
        command(
            "repeat",
            () => playerCommandService.repeat(agent.id, nextMode, {
                onSuccess: () => {
                    console.log("[PlaylistToolbar] Repeat command sent:", nextMode);
                },
                onError: (error) => {
                    console.error("[PlaylistToolbar] Repeat failed:", error);
                    setProcessing("repeat", false);
                }
            }),
            // Optimistic update - update UI immediately
            () => {
                setPlaylist({
                    ...playlist,
                    repeat: nextMode
                });
            }
        );
    };

    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 pb-4">
            <button
                type="button"
                onClick={() => command("shufflePlaylist", () =>
                    playerCommandService.shufflePlaylist(agent.id, {
                        onSuccess: () => {
                            console.log("[PlaylistToolbar] Shuffle command sent");
                        },
                        onError: (error) => {
                            console.error("[PlaylistToolbar] Shuffle failed:", error);
                            setProcessing("shufflePlaylist", false);
                        }
                    })
                )}
                disabled={disabled || processing.shufflePlaylist || playlist.items.length === 0}
                className={`${buttonClass} bg-white/[0.07] text-slate-100 hover:bg-white/[0.12]`}
            >
                <Shuffle size={18} /> {processing.shufflePlaylist ? "Mengacak..." : "Acak"}
            </button>
            <button
                type="button"
                onClick={handleRepeatClick}
                disabled={disabled || processing.repeat}
                className={`${buttonClass} ${playlist.repeat === "OFF" ? "bg-white/[0.07] text-slate-200 hover:bg-white/[0.12]" : "bg-teal-300/12 text-teal-100"}`}
            >
                {playlist.repeat === "ONE" ? <ListRestart size={16} /> : <Repeat size={16} />} {processing.repeat ? "Memuat..." : repeatLabel}
            </button>
            <button
                type="button"
                onClick={() => command(
                    "clearPlaylist",
                    () => playerCommandService.clearPlaylist(agent.id, {
                        onSuccess: () => {
                            console.log("[PlaylistToolbar] Clear command sent");
                        },
                        onError: (error) => {
                            console.error("[PlaylistToolbar] Clear failed:", error);
                            setProcessing("clearPlaylist", false);
                        }
                    }),
                    // Optimistic update - clear playlist immediately
                    () => {
                        setPlaylist({
                            ...playlist,
                            items: [],
                            currentIndex: -1
                        });
                    }
                )}
                disabled={disabled || processing.clearPlaylist || playlist.items.length === 0}
                className={`${buttonClass} ml-auto bg-rose-400/10 text-rose-200 hover:bg-rose-400/18`}
            >
                <Trash2 size={16} /> {processing.clearPlaylist ? "Menghapus..." : "Kosongkan"}
            </button>
        </div>
    );
}
