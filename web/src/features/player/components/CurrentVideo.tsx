import { useAppStore } from "../../../store/appStore";

// Helper function to format seconds to MM:SS
function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CurrentVideo() {

    const { playlist, player } = useAppStore();

    // If no player video, show nothing
    if (!player.videoId) {
        return (
            <div className="rounded-xl bg-[#12121f] p-4 shadow-[0_0_15px_rgba(255,45,149,0.1)] border border-[#2a2a4a]">
                <p className="text-[#b8b8d0]">No video playing</p>
            </div>
        );
    }

    // Try to find the current video in playlist by matching videoId
    let playlistVideo = null;
    if (playlist.items && playlist.items.length > 0) {
        playlistVideo = playlist.items.find(item => item.videoId === player.videoId);
    }

    // Use playlist video if found, otherwise use player video info (title, channel, thumbnail, duration from agent)
    const video = playlistVideo || {
        title: player.title || `Video ${player.videoId}`,
        channel: player.channel || "Unknown Channel",
        thumbnail: player.thumbnail || `https://img.youtube.com/vi/${player.videoId}/mqdefault.jpg`,
        duration: formatDuration(player.duration)
    };

    return (
        <div className="rounded-xl bg-[#12121f] p-4 shadow-[0_0_20px_rgba(255,45,149,0.2)] border border-[#2a2a4a] landscape:p-3">
            <h3 className="text-sm font-semibold text-[#00f0ff] mb-2 landscape:mb-1 uppercase tracking-wider">
                Now Playing
            </h3>
            <div className="flex gap-4 landscape:gap-3">
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded-lg landscape:w-40 landscape:h-24 shadow-[0_0_10px_rgba(255,45,149,0.3)]"
                    onError={(e) => {
                        // Fallback thumbnail
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${player.videoId}/default.jpg`;
                    }}
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate landscape:text-base text-white">
                        {video.title}
                    </h4>
                    <p className="text-sm text-[#b8b8d0] truncate landscape:text-sm">
                        {video.channel}
                    </p>
                    <p className="text-xs text-[#ff2d95] mt-1 landscape:mt-2 font-mono">
                        {video.duration}
                    </p>
                </div>
            </div>
        </div>
    );
}
