import { Outlet } from "react-router-dom";

import Footer from "./Footer";

import FullPageLoading from "../shared/components/FullPageLoading";

import { useLoading } from "../context/LoadingContext";
import { useAgent } from "../hooks/useAgent";

export default function MainLayout() {

    // Initialize agent connection and state - must be called at layout level
    // so socket listener is always active across all pages
    useAgent();

    const { globalLoading, initialLoading, processing } = useLoading();

    // Check if any processing action is active
    const isProcessing = Object.values(processing).some(Boolean);

    // Get the active processing key for duration calculation
    const getActiveProcessingKey = () => {
        if (processing.play) return "play";
        if (processing.pause) return "pause";
        if (processing.stop) return "stop";
        if (processing.next) return "next";
        if (processing.previous) return "previous";
        if (processing.volume) return "volume";
        if (processing.mute) return "mute";
        if (processing.fullscreen) return "fullscreen";
        if (processing.search) return "search";
        if (processing.addToPlaylist) return "addToPlaylist";
        if (processing.removeFromPlaylist) return "removeFromPlaylist";
        if (processing.clearPlaylist) return "clearPlaylist";
        if (processing.shufflePlaylist) return "shufflePlaylist";
        if (processing.skipAd) return "skipAd";
        if (processing.repeat) return "repeat";
        if (processing.seek) return "seek";
        if (processing.openVideo) return "openVideo";
        if (processing.playPlaylistItem) return "playPlaylistItem";
        return null;
    };

    // Determine loading message based on active processing
    const getLoadingMessage = () => {
        if (processing.play) return "Playing...";
        if (processing.pause) return "Pausing...";
        if (processing.stop) return "Stopping...";
        if (processing.next) return "Next video...";
        if (processing.previous) return "Previous video...";
        if (processing.volume) return "Adjusting volume...";
        if (processing.mute) return "Toggling mute...";
        if (processing.fullscreen) return "Toggling fullscreen...";
        if (processing.search) return "Searching...";
        if (processing.addToPlaylist) return "Adding to playlist...";
        if (processing.removeFromPlaylist) return "Removing from playlist...";
        if (processing.clearPlaylist) return "Clearing playlist...";
        if (processing.shufflePlaylist) return "Shuffling playlist...";
        if (processing.skipAd) return "Skipping ad...";
        if (processing.repeat) return "Setting repeat...";
        if (processing.seek) return "Seeking...";
        if (processing.openVideo) return "Opening video...";
        if (processing.playPlaylistItem) return "Playing from playlist...";
        return "Processing...";
    };

    // Duration based on process type (in ms)
    // Quick actions: 300ms
    // Medium actions: 500ms  
    // Slow actions (involving network/loading): 1000ms
    const getDuration = (key: string | null) => {
        if (!key) return 500;
        
        const slowActions = ["openVideo", "playPlaylistItem", "search"];
        const mediumActions = ["play", "pause", "stop", "next", "previous", "addToPlaylist", "removeFromPlaylist", "clearPlaylist", "shufflePlaylist", "skipAd", "repeat"];
        const quickActions = ["volume", "mute", "fullscreen", "seek"];
        
        if (slowActions.includes(key)) return 1000;
        if (mediumActions.includes(key)) return 500;
        if (quickActions.includes(key)) return 300;
        return 500;
    };

    // Determine if we should show loading
    const showLoading = globalLoading || initialLoading || isProcessing;
    const activeKey = getActiveProcessingKey();
    const loadingDuration = isProcessing ? getDuration(activeKey) : undefined;
    const loadingMessage = isProcessing ? getLoadingMessage() : (globalLoading || initialLoading ? "Loading..." : undefined);

    return (

        <div
            className="
                min-h-screen
                bg-[#0a0a14]
            "
        >

            {showLoading && (
                <FullPageLoading 
                    message={loadingMessage}
                    duration={loadingDuration}
                />
            )}

            {/* Mobile: Full width | Tablet/Desktop: Centered container */}
            <div
                className="
                    mx-auto
                    flex
                    min-h-screen
                    flex-col
                    bg-[#12121f]
                    md:max-w-2xl
                    lg:max-w-4xl
                    xl:max-w-5xl
                    md:shadow-[0_0_30px_rgba(255,45,149,0.2)]
                    md:my-4
                    md:rounded-xl
                    md:min-h-[calc(100vh-32px)]
                    lg:min-h-[calc(100vh-48px)]
                    pt-[env(safe-area-inset-top)]
                    border-x border-[#2a2a4a]
                "
            >

                <main
                    className="
                        flex-1
                        overflow-y-auto
                        p-4
                        pb-20
                        md:pb-4
                        lg:p-6
                    "
                >

                    <Outlet />

                </main>

                <Footer />
            </div>

        </div>

    );

}