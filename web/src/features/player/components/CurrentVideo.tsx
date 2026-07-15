import { useAppStore } from "../../../store/appStore";

export default function CurrentVideo() {

    const { queue } = useAppStore();

    // Get current video from queue based on currentIndex
    const currentVideo = queue.currentIndex >= 0 
        ? queue.items[queue.currentIndex] 
        : null;

    if (!currentVideo) {
        return (
            <div className="rounded-xl bg-white p-4 shadow">
                <p className="text-gray-500">No video playing</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white p-4 shadow">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Now Playing
            </h3>
            <div className="flex gap-4">
                <img
                    src={currentVideo.thumbnail}
                    alt={currentVideo.title}
                    className="w-32 h-20 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">
                        {currentVideo.title}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                        {currentVideo.channel}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {currentVideo.duration}
                    </p>
                </div>
            </div>
        </div>
    );
}
