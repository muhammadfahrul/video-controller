import {
    ChevronLeft,
    ChevronRight
} from "lucide-react";

interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage?: number;
    totalItems?: number;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    totalItems
}: Props) {
    // Don't render if no pages or invalid
    if (totalPages < 1) {
        return null;
    }

    const getVisiblePages = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);
            
            if (currentPage > 3) {
                pages.push("...");
            }
            
            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (currentPage < totalPages - 2) {
                pages.push("...");
            }
            
            // Always show last page
            pages.push(totalPages);
        }
        
        return pages;
    };

    return (
        <div className="
            flex 
            flex-col 
            sm:flex-row 
            items-center 
            justify-between 
            gap-4 
            px-2 
            py-4
        ">
            {/* Info section - hidden on small screens */}
            <div className="
                text-sm 
                text-gray-500
                order-2 
                sm:order-1
            ">
                {totalItems !== undefined && itemsPerPage && (
                    <span className="hidden sm:inline">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                    </span>
                )}
                {/* Mobile: show current page / total */}
                {totalItems !== undefined && (
                    <span className="sm:hidden">
                        {currentPage} / {totalPages}
                    </span>
                )}
            </div>
            
            {/* Pagination controls */}
            <div className="
                flex 
                flex-wrap 
                items-center 
                justify-center 
                gap-1
                order-1 
                sm:order-2
            ">
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`
                        flex 
                        items-center 
                        justify-center
                        gap-1
                        rounded-lg 
                        px-2 
                        sm:px-3 
                        py-2
                        text-sm 
                        font-medium
                        transition-colors
                        ${currentPage === 1
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-gray-100 active:bg-gray-200"}
                    `}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} className="sm:hidden" />
                    <ChevronLeft size={18} className="hidden sm:block" />
                    <span className="hidden sm:block">Prev</span>
                </button>
                
                {/* Page numbers - hide some on very small screens */}
                <div className="flex items-center gap-1">
                    {getVisiblePages().map((page, index) => (
                        typeof page === "number" ? (
                            <button
                                key={index}
                                onClick={() => onPageChange(page)}
                                className={`
                                    flex 
                                    items-center 
                                    justify-center
                                    rounded-lg 
                                    min-w-9 
                                    px-2 
                                    sm:px-3 
                                    py-2
                                    text-sm 
                                    font-medium
                                    transition-colors
                                    ${page === currentPage
                                        ? "bg-red-600 text-white"
                                        : "hover:bg-gray-100 active:bg-gray-200"}
                                `}
                            >
                                {page}
                            </button>
                        ) : (
                            <span
                                key={index}
                                className="px-1 sm:px-2 text-gray-400"
                            >
                                {page}
                            </span>
                        )
                    ))}
                </div>
                
                {/* Next button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`
                        flex 
                        items-center 
                        justify-center
                        gap-1
                        rounded-lg 
                        px-2 
                        sm:px-3 
                        py-2
                        text-sm 
                        font-medium
                        transition-colors
                        ${currentPage === totalPages
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-gray-100 active:bg-gray-200"}
                    `}
                    aria-label="Next page"
                >
                    <span className="hidden sm:block">Next</span>
                    <ChevronRight size={18} className="hidden sm:block" />
                    <ChevronRight size={16} className="sm:hidden" />
                </button>
            </div>
        </div>
    );
}
