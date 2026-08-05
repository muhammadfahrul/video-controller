import { useAppStore } from "../../../store/appStore";

function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CurrentVideo() {
    const { playlist, player } = useAppStore();

    if (!player.videoId) {
        return (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                <p className="font-medium text-white">Belum ada lagu yang diputar</p>
                <p className="mt-1 text-sm text-slate-400">Cari lagu atau pilih dari daftar lagu untuk memulai karaoke.</p>
            </div>
        );
    }

    const playlistVideo = playlist.items?.find((item) => item.videoId === player.videoId);
    const video = playlistVideo || {
        title: player.title || `Video ${player.videoId}`,
        channel: player.channel || "Channel tidak diketahui",
        thumbnail: player.thumbnail || `https://img.youtube.com/vi/${player.videoId}/mqdefault.jpg`,
        duration: formatDuration(player.duration)
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#182131] to-[#101520] p-4 shadow-xl shadow-black/10 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-300">
                <span className="size-2 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.9)]" />
                Lagu sedang diputar
            </div>
            <div className="flex gap-4 sm:gap-5">
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-24 w-36 shrink-0 rounded-xl object-cover shadow-lg shadow-black/20 sm:h-28 sm:w-48"
                    onError={(event) => {
                        (event.target as HTMLImageElement).src = `https://img.youtube.com/vi/${player.videoId}/default.jpg`;
                    }}
                />
                <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white sm:text-lg">{video.title}</h2>
                    <p className="mt-1 truncate text-sm text-slate-400">{video.channel}</p>
                    <p className="mt-2 text-xs font-semibold text-teal-200">{video.duration}</p>
                </div>
            </div>
        </section>
    );
}
