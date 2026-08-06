import { useAppStore } from "../../../store/appStore";

export default function PlayerStatus() {
    const { player } = useAppStore();

    // Safely access player properties with defaults
    const status = player?.playing ? "Playing" : "Paused";
    const volume = player?.volume ?? 0;
    const currentTime = (player?.currentTime ?? 0).toFixed(1);
    const duration = (player?.duration ?? 0).toFixed(1);
    const isFullscreen = player?.fullscreen ?? false;

    return (
        <div className="rounded-xl bg-[#12121f] p-4 shadow-[0_0_15px_rgba(255,45,149,0.1)] border border-[#2a2a4a]">
            <div>
                Status :
                <strong>
                    {` ${status}`}
                </strong>
            </div>
            <div>
                Volume :
                {volume}
            </div>
            <div>
                Time :
                {currentTime}
                /
                {duration}
            </div>
            <div>
                Fullscreen :
                {isFullscreen ? " Yes" : " No"}
            </div>
        </div>
    );
}