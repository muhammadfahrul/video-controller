import { useEffect, useState } from "react";
import PlaylistEmpty from "./PlaylistEmpty";
import PlaylistItemCard from "./PlaylistItem";
import Pagination from "../../../shared/components/Pagination";

import { useAppStore } from "../../../store/appStore";

import {
    playerCommandService
} from "../../../services";

import PlaylistToolbar
from "./PlaylistToolbar";

export default function PlaylistPanel() {

    const {

        agent,

        playlist,
        removingItemId,
        setRemovingItemId,
        processing,
        setProcessing

    } = useAppStore();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    // Calculate pagination
    const totalItems = playlist.items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const activePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const startIndex = (activePage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = playlist.items.slice(startIndex, endIndex);

    return (

        <section
            className="
                space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5
            "
        >

            <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">{totalItems} lagu dalam antrean</h2>
                <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-medium text-slate-400">{playlist.repeat === "OFF" ? "Tanpa pengulangan" : `Ulang ${playlist.repeat === "ONE" ? "satu" : "semua"}`}</span>
            </div>

            <PlaylistToolbar />

            {playlist.items.length === 0 ? (
                <PlaylistEmpty />
            ) : (
                <>
                    <div
                        className="
                            space-y-3
                        "
                    >
                        {paginatedItems.map((item, index) => (
                            <PlaylistItemCard
                                key={item.id}
                                item={item}
                                active={(startIndex + index) === playlist.currentIndex}
                                removing={removingItemId === item.id}
                                disabled={!agent.online || processing.removeFromPlaylist}
                                onPlay={() => {
                                    if (!agent.online) return;
                                    playerCommandService.playPlaylistItem(agent.id, item.id);
                                }}
                                onRemove={() => {
                                    if (!agent.online) return;
                                    setRemovingItemId(item.id);
                                    setProcessing("removeFromPlaylist", true);
                                    playerCommandService.removePlaylist(agent.id, item.id);
                                    setTimeout(() => {
                                        setRemovingItemId(null);
                                        setProcessing("removeFromPlaylist", false);
                                    }, 500);
                                }}
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
