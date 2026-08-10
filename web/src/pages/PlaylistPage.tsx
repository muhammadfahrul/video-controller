import PlaylistPanel from "../features/playlist/components/PlaylistPanel";
import { usePlaylist } from "../hooks/usePlaylist";

export default function PlaylistPage() {

    // Initialize playlist listener to receive playlist state updates
    usePlaylist();

    return (

        <div className="space-y-4 landscape:space-y-5">

            <PlaylistPanel />

        </div>

    );

}