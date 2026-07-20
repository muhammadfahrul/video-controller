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
    // Don't render if only one page or invalid
    if (totalPages <= 1) {
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
        <div className="flex items-center justify-between px-2 py-4">
            {/* Info section */}
            <div className="text-sm text-gray-500">
                {totalItems !== undefined && itemsPerPage && (
                    <span>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                    </span>
                )}
            </div>
            
            {/* Pagination controls */}
            <div className="flex items-center gap-1">
                {/* Previous button */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`
                        flex items-center justify-center
                        rounded-lg px-3 py-2
                        text-sm font-medium
                        transition-colors
                        ${currentPage === 1
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-gray-100"}
                    `}
                >
                    <ChevronLeft size={18} />
                </button>
                
                {/* Page numbers */}
                {getVisiblePages().map((page, index) => (
                    typeof page === "number" ? (
                        <button
                            key={index}
                            onClick={() => onPageChange(page)}
                            className={`
                                flex items-center justify-center
                                rounded-lg px-3 py-2
                                text-sm font-medium
                                transition-colors
                                ${page === currentPage
                                    ? "bg-red-600 text-white"
                                    : "hover:bg-gray-100"}
                            `}
                        >
                            {page}
                        </button>
                    ) : (
                        <span
                            key={index}
                            className="px-2 text-gray-400"
                        >
                            {page}
                        </span>
                    )
                ))}
                
                {/* Next button */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`
                        flex items-center justify-center
                        rounded-lg px-3 py-2
                        text-sm font-medium
                        transition-colors
                        ${currentPage === totalPages
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-gray-100"}
                    `}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
