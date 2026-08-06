import { useState } from "react";
import { Loader2, Play, Plus } from "lucide-react";
import Card from "../../../shared/components/Card";
import type { SearchResult } from "../types/SearchResult";
import type { PlaylistState } from "../../../types/app/PlaylistState";
import { useAppStore } from "../../../store/appStore";
import { playerCommandService } from "../../../services/player";

interface Props { result: SearchResult; }

export default function SearchResultCard({ result }: Props) {
    const { agent, playlist, setPlaylist } = useAppStore();
    const [localAdding, setLocalAdding] = useState(false);
    const [localPlaying, setLocalPlaying] = useState(false);
    const disabled = !agent.id || !agent.online;

    const play = () => {
        if (disabled) return;
        setLocalPlaying(true);
        playerCommandService.openVideo(agent.id, result.videoId);
        window.setTimeout(() => setLocalPlaying(false), 500);
    };

    const addPlaylist = () => {
        if (disabled) return;

        const queuedItem: PlaylistState["items"][number] = {
            id: `pending-${result.videoId}-${Date.now()}`,
            videoId: result.videoId,
            title: result.title,
            channel: result.channel,
            thumbnail: result.thumbnail,
            duration: result.duration
        };

        // Show the requested song immediately; the agent snapshot replaces this
        // temporary item with the persisted playlist state on its next update.
        setPlaylist({
            ...playlist,
            items: [...playlist.items, queuedItem],
            currentIndex: playlist.currentIndex === -1 ? 0 : playlist.currentIndex
        });

        setLocalAdding(true);
        playerCommandService.addPlaylist(agent.id, {
            videoId: result.videoId,
            title: result.title,
            channel: result.channel,
            thumbnail: result.thumbnail,
            duration: result.duration
        });
        window.setTimeout(() => setLocalAdding(false), 500);
    };

    return (
        <Card className="flex gap-3 p-3 sm:gap-4 sm:p-4">
            <img src={result.thumbnail} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover sm:h-24 sm:w-40" loading="lazy" />
            <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="line-clamp-2 font-semibold leading-snug text-white">{result.title}</h3>
                <p className="mt-1 truncate text-sm text-slate-400">{result.channel}</p>
                <p className="mt-1 text-xs font-medium text-teal-200">{result.duration}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={play} disabled={disabled || localPlaying} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-teal-300 px-3 text-sm font-semibold text-slate-950 transition ${disabled || localPlaying ? "cursor-not-allowed opacity-45" : "hover:bg-teal-200"}`}>
                        {localPlaying ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                        Putar sekarang
                    </button>
                    <button type="button" onClick={addPlaylist} disabled={disabled || localAdding} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-teal-300/35 bg-teal-300/8 px-3 text-sm font-semibold text-teal-100 transition ${disabled || localAdding ? "cursor-not-allowed opacity-45" : "hover:bg-teal-300/16"}`}>
                        {localAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Tambah lagu
                    </button>
                </div>
            </div>
        </Card>
    );
}
