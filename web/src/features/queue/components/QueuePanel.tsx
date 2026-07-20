import { useState } from "react";
import QueueEmpty from "./QueueEmpty";
import QueueItemCard from "./QueueItem";
import Pagination from "../../../shared/components/Pagination";

import { useAppStore } from "../../../store/appStore";

import {
    playerCommandService
} from "../../../services";

import QueueToolbar
from "./QueueToolbar";

export default function QueuePanel() {

    const {

        agent,

        queue,
        removingItemId,
        setRemovingItemId,
        processing,
        setProcessing

    } = useAppStore();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    // Calculate pagination
    const totalItems = queue.items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = queue.items.slice(startIndex, endIndex);

    return (

        <section
            className="
                space-y-4
            "
        >

            <QueueToolbar/>

            {queue.items.length === 0 ? (
                <QueueEmpty />
            ) : (
                <>
                    <div
                        className="
                            space-y-3
                        "
                    >
                        {paginatedItems.map((item, index) => (
                            <QueueItemCard
                                key={item.id}
                                item={item}
                                active={(startIndex + index) === queue.currentIndex}
                                removing={removingItemId === item.id}
                                disabled={processing.removeFromQueue}
                                onPlay={() => {
                                    playerCommandService.playQueueItem(agent.id, item.id);
                                }}
                                onRemove={() => {
                                    setRemovingItemId(item.id);
                                    setProcessing("removeFromQueue", true);
                                    playerCommandService.removeQueue(agent.id, item.id);
                                    setTimeout(() => {
                                        setRemovingItemId(null);
                                        setProcessing("removeFromQueue", false);
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