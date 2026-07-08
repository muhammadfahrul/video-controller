import type {

    SearchResult

} from "../../features/search/types/SearchResult";

export interface SearchState {

    keyword: string;

    results: SearchResult[];

}