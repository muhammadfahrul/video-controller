import type {

    SearchResult

} from "../../features/search/types/SearchResult";

import { getServerUrl } from "../../utils/getServerUrl";

export class SearchService {

    async search(

        keyword: string

    ): Promise<SearchResult[]> {

        const response =

            await fetch(

                `${getServerUrl()}/api/search?keyword=${encodeURIComponent(keyword)}`

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