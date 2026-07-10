import type {

    SearchResult

} from "../../features/search/types/SearchResult";

export class SearchService {

    async search(

        keyword: string

    ): Promise<SearchResult[]> {

        const response =

            await fetch(

                `http://localhost:3000/api/search?keyword=${encodeURIComponent(keyword)}`

            );

        if (!response.ok) {

            throw new Error(

                "Search failed"

            );

        }

        return await response.json();

    }

}

export const searchService =

    new SearchService();