import { useState } from "react";
import PlaylistEmpty from "./PlaylistEmpty";
import PlaylistItemCard from "./PlaylistItem";
import Pagination from "../../../shared/components/Pagination";
import { useAppStore } from "../../../store/appStore";
import { playerCommandService } from "../../../services";
import PlaylistToolbar from "./PlaylistToolbar";

export default function PlaylistPanel() {
    const {
        agent,
        playlist,
        removingItemId,
        setRemovingItemId,
        processing,
        setProcessing,
        setPlaylist
    } = useAppStore();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Calculate pagination
    const totalItems = playlist.items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const activePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

    const startIndex = (activePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = playlist.items.slice(startIndex, endIndex);

    const handleRemoveItem = (itemId: string) => {
        if (!agent.online) return;
        
        // Optimistic update: remove item immediately from UI
        const updatedItems = playlist.items.filter(item => item.id !== itemId);
        setPlaylist({
            ...playlist,
            items: updatedItems,
            // Adjust currentIndex if needed
            currentIndex: Math.max(-1, Math.min(playlist.currentIndex, updatedItems.length - 1))
        });
        
        setRemovingItemId(itemId);
        setProcessing("removeFromPlaylist", true);
        
        // Send command to server
        playerCommandService.removePlaylist(agent.id, itemId, {
            onSuccess: () => {
                console.log("[PlaylistPanel] Remove success");
            },
            onError: (error) => {
                console.error("[PlaylistPanel] Remove failed:", error);
            }
        });
        
        // Reset state after timeout
        setTimeout(() => {
            setRemovingItemId(null);
            setProcessing("removeFromPlaylist", false);
        }, 3000);
    };

    return (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">{totalItems} lagu dalam antrean</h2>
                <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-slate-400">
                    {playlist.repeat === "OFF" ? "Tanpa pengulangan" : `Ulang ${playlist.repeat === "ONE" ? "satu" : "semua"}`}
                </span>
            </div>

            <PlaylistToolbar />

            {playlist.items.length === 0 ? (
                <PlaylistEmpty />
            ) : (
                <>
                    <div className="space-y-3">
                        {paginatedItems.map((item, index) => (
                            <PlaylistItemCard
                                key={item.id}
                                item={item}
                                active={startIndex + index === playlist.currentIndex}
                                removing={removingItemId === item.id}
                                disabled={!agent.online || processing.removeFromPlaylist}
                                onPlay={() => {
                                    if (!agent.online) return;
                                    playerCommandService.playPlaylistItem(agent.id, item.id);
                                }}
                                onRemove={() => handleRemoveItem(item.id)}
                            />
                        ))}
                    </div>

                    <Pagination
                        currentPage={activePage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={totalItems}
                    />
                </>
            )}
        </section>
    );
}
