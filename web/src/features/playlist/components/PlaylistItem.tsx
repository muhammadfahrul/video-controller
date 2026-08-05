import { Loader2, Play, Trash2 } from "lucide-react";
import type { PlaylistItem } from "../types/PlaylistItem";
import Card from "../../../shared/components/Card";

interface Props {
    item: PlaylistItem;
    active: boolean;
    onPlay(): void;
    onRemove(): void;
    removing?: boolean;
    disabled?: boolean;
}

export default function PlaylistItemCard({ item, active, onPlay, onRemove, removing = false, disabled = false }: Props) {
    return (
        <Card className={`flex gap-3 p-3 sm:items-center sm:gap-4 sm:p-4 ${active ? "border-teal-300/30 bg-teal-300/[0.06]" : ""}`} onClick={onPlay}>
            <img src={item.thumbnail} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover sm:h-20 sm:w-32" loading="lazy" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="flex-1 truncate font-semibold text-white">{item.title}</h3>
                    {active && <span className="inline-flex items-center gap-1 rounded-full bg-teal-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-950"><Play size={10} fill="currentColor" /> Kini</span>}
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">{item.channel}</p>
                <p className="mt-1 text-xs font-medium text-teal-200">{item.duration}</p>
            </div>
            <button type="button" aria-label={`Hapus ${item.title}`} onClick={(event) => { event.stopPropagation(); onRemove(); }} disabled={removing || disabled} className={`grid size-10 shrink-0 place-items-center self-start rounded-xl text-rose-300 transition sm:self-center ${removing || disabled ? "cursor-not-allowed opacity-45" : "hover:bg-rose-400/15"}`}>
                {removing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
        </Card>
    );
}
