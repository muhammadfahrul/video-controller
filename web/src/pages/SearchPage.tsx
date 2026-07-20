import { useState, useEffect } from "react";
import SearchBar from "../features/search/components/SearchBar";
import SearchResultCard from "../features/search/components/SearchResultCard";
import Pagination from "../shared/components/Pagination";
import { useAppStore } from "../store/appStore";
import { useAgent } from "../hooks/useAgent";
import { usePlaylist } from "../hooks/usePlaylist";
import { agentService, apiService } from "../services";
import { searchService } from "../services/search";
import type { SearchResult } from "../features/search/types/SearchResult";

export default function SearchPage(){

    useAgent();
    usePlaylist();

    const [keyword, setKeyword] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    
    const { setAgent, loadAgent, setProcessing } = useAppStore();

    const search = async () => {
        if (!keyword.trim()) {
            setResults([]);
            return;
        }

        try {
            setLoading(true);
            setProcessing("search", true);
            setError("");
            const response = await searchService.search(keyword);
            setResults(response);
        } catch {
            setError("Search failed");
        } finally {
            setLoading(false);
            setProcessing("search", false);
        }
    };

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

    useEffect(() => {
        setAgent({
            id: "windows-agent-01",
            name: "Windows Player",
            online: true,
            lastHeartbeat: Date.now()
        });

        apiService.get("/api/agents")
            .then(console.log)
            .catch(console.error);

        async function load() {
            try {
                const agents = await agentService.list();
                if (agents.length === 0) return;
                const agent = agents[0];
                loadAgent({
                    id: agent.id,
                    name: agent.name,
                    online: agent.status === "ONLINE",
                    lastHeartbeat: agent.lastHeartbeat
                });
            } catch (err) {
                console.error(err);
            }
        }

        load();
    }, []);

    return (
        <div className="space-y-5 landscape:space-y-6">

            <SearchBar
                value={keyword}
                onChange={setKeyword}
                onSearch={handleSearch}
                loading={loading}
            />

            {loading && (
                <div className="rounded-xl bg-gray-100 p-4 text-center">
                    Searching...
                </div>
            )}

            {!loading && results.length === 0 && keyword && (
                <div className="rounded-xl border p-6 text-center text-gray-500">
                    No videos found
                </div>
            )}

            {error && (
                <div className="rounded-xl bg-red-100 p-4 text-red-600">
                    {error}
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
