import { useAppStore } from "../../../store/appStore";

// Helper function to format seconds to MM:SS
function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CurrentVideo() {

    const { queue, player } = useAppStore();

    // If no player video, show nothing
    if (!player.videoId) {
        return (
            <div className="rounded-xl bg-white p-4 shadow">
                <p className="text-gray-500">No video playing</p>
            </div>
        );
    }

    // Try to find the current video in queue by matching videoId
    let queueVideo = null;
    if (queue.items && queue.items.length > 0) {
        queueVideo = queue.items.find(item => item.videoId === player.videoId);
    }

    // Use queue video if found, otherwise use player video info (title, channel, thumbnail, duration from agent)
    const video = queueVideo || {
        title: player.title || `Video ${player.videoId}`,
        channel: player.channel || "Unknown Channel",
        thumbnail: player.thumbnail || `https://img.youtube.com/vi/${player.videoId}/mqdefault.jpg`,
        duration: formatDuration(player.duration)
    };

    return (
        <div className="rounded-xl bg-white p-4 shadow">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Now Playing
            </h3>
            <div className="flex gap-4">
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded-lg"
                    onError={(e) => {
                        // Fallback thumbnail
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${player.videoId}/default.jpg`;
                    }}
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">
                        {video.title}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                        {video.channel}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {video.duration}
                    </p>
                </div>
            </div>
        </div>
    );
}
