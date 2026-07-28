import { useEffect, useRef, useState } from "react";
import SearchBar from "../features/search/components/SearchBar";
import SearchResultCard from "../features/search/components/SearchResultCard";
import Pagination from "../shared/components/Pagination";
import { useAppStore } from "../store/appStore";
import { searchService } from "../services/search";
import type { SearchResult } from "../features/search/types/SearchResult";

export default function SearchPage(){

    const [keyword, setKeyword] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    const { setProcessing, agent } = useAppStore();
    const abortControllerRef = useRef<AbortController | null>(null);

    const search = async () => {
        if (!keyword.trim()) {
            setResults([]);
            return;
        }

        // Don't search if agent is offline
        if (!agent.online) {
            return;
        }

        // Cancel previous pending search request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            setLoading(true);
            setProcessing("search", true);
            setError("");
            const response = await searchService.search(keyword, controller.signal);
            setResults(response);
        } catch (err: any) {
            if (err.name === "AbortError") {
                return; // Ignore aborted requests
            }
            setError("Search failed");
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
                setProcessing("search", false);
            }
        }
    };

    // Abort pending requests when component unmounts
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Reset to page 1 when search results change
    const handleSearch = async () => {
        setCurrentPage(1);
        await search();
    };
    
    // Calculate pagination
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = results.slice(startIndex, endIndex);

    return (
        <div className="space-y-5 tablet-landscape-text">

            <div>
                <p className="text-sm text-slate-400 tablet-landscape-text">Temukan lagu karaoke favorit dan masukkan ke daftar nyanyi.</p>
            </div>

            <SearchBar
                value={keyword}
                onChange={setKeyword}
                onSearch={handleSearch}
                loading={loading}
            />

            {loading && (
                <div className="rounded-2xl border border-teal-300/15 bg-teal-300/5 p-5 text-center text-sm text-teal-100">
                    Mencari lagu karaoke...
                </div>
            )}

            {!loading && results.length === 0 && keyword && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-slate-400">
                    Lagu tidak ditemukan. Coba judul atau nama penyanyi lain.
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
                    Pencarian gagal. Silakan coba lagi.
                </div>
            )}

            {paginatedResults.map(result => (
                <SearchResultCard key={result.videoId} result={result} />
            ))}

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalResults}
            />

        </div>
    );

}
