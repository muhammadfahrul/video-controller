import { useState } from "react";
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
                                disabled={processing.removeFromPlaylist}
                                onPlay={() => {
                                    playerCommandService.playPlaylistItem(agent.id, item.id);
                                }}
                                onRemove={() => {
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