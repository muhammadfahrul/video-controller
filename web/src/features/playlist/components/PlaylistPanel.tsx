import { useState } from "react";
import PlaylistEmpty from "./PlaylistEmpty";
import PlaylistItemCard from "./PlaylistItem";
import Pagination from "../../../shared/components/Pagination";

import { useAgentState, usePlaylistState } from "../../../hooks/useAppState";
import { useLoading } from "../../../context/LoadingContext";

import {
    playerCommandService
} from "../../../services";

import PlaylistToolbar
from "./PlaylistToolbar";

export default function PlaylistPanel() {

    const agent = useAgentState();
    const playlist = usePlaylistState();
    const {
        removingItemId,
        setRemovingItemId,
        processing,
        setProcessing
    } = useLoading();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    // Calculate pagination
    const totalItems = playlist.items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = playlist.items.slice(startIndex, endIndex);

    return (

        <section
            className="
                space-y-4
                bg-[#12121f]
                p-4
                rounded-xl
                border border-[#2a2a4a]
                shadow-[0_0_20px_rgba(168,85,247,0.15)]
            "
        >

            <PlaylistToolbar/>

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
                                canMoveUp={(startIndex + index) > 0}
                                canMoveDown={(startIndex + index) < totalItems - 1}
                                moving={processing.movePlaylistItem}
                                onPlay={() => {
                                    if (!agent.online) return;
                                    setProcessing("playPlaylistItem", true);
                                    playerCommandService.playPlaylistItem(agent.id, item.id);
                                    setTimeout(() => setProcessing("playPlaylistItem", false), 1000);
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
                                onMoveUp={() => {
                                    if (!agent.online) return;
                                    setProcessing("movePlaylistItem", true);
                                    playerCommandService.movePlaylistItem(agent.id, item.id, "up");
                                    setTimeout(() => setProcessing("movePlaylistItem", false), 500);
                                }}
                                onMoveDown={() => {
                                    if (!agent.online) return;
                                    setProcessing("movePlaylistItem", true);
                                    playerCommandService.movePlaylistItem(agent.id, item.id, "down");
                                    setTimeout(() => setProcessing("movePlaylistItem", false), 500);
                                }}
                            />
                        ))}
                    </div>

                    <Pagination
                        currentPage={currentPage}
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