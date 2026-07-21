import Card from "../../../shared/components/Card";
import type {

    SearchResult

} from "../types/SearchResult";

import { useAppStore } from "../../../store/appStore";

import {

    playerCommandService

} from "../../../services/player";

import {

    Play,
    Plus,
    Loader2

} from "lucide-react";

interface Props{

    result:
        SearchResult;

}

export default function SearchResultCard({

    result

}:Props){

    const {

        agent,
        addingToPlaylist,
        setAddingToPlaylist,
        setProcessing,
        processing

    } = useAppStore();

    const play = () => {

        if (!agent.id) {

            return;

        }

        playerCommandService.openVideo(

            agent.id,

            result.videoId

        );

        setProcessing("play", true);
        setTimeout(() => setProcessing("play", false), 500);

    };

    const addPlaylist = () => {

        if (!agent.id) {

            return;

        }

        setAddingToPlaylist(true);

        playerCommandService.addPlaylist(

            agent.id,

            {

                videoId:

                    result.videoId,

                title:

                    result.title,

                channel:

                    result.channel,

                thumbnail:

                    result.thumbnail,

                duration:

                    result.duration

            }

        );

        setTimeout(() => setAddingToPlaylist(false), 500);

    };

    return(

        <Card className="landscape:flex landscape:items-start landscape:gap-4">

            <img

                src={result.thumbnail}

                alt={result.title}

                className="
                    h-20
                    w-100
                    rounded-lg
                    object-cover
                "

            />

            <div
                className="
                    flex-1
                "
            >

                <h3
                    className="
                        line-clamp-2
                        font-semibold
                        text-white
                    "
                >

                    {result.title}

                </h3>

                <p
                    className="
                        mt-2
                        text-sm
                        text-[#b8b8d0]
                    "
                >

                    {result.channel}

                </p>

                <p
                    className="
                        text-xs
                        text-[#00f0ff]
                    "
                >

                    {result.duration}

                </p>

                <div
                    className="
                        mt-4
                        flex
                        gap-2
                    "
                >

                    <button

                        onClick={play}

                        disabled={!agent.id || processing.play}

                        className={`
                            flex
                            items-center
                            gap-2
                            rounded-lg
                            bg-[#ff2d95]
                            px-3
                            py-2
                            text-sm
                            text-white
                            transition
                            shadow-[0_0_10px_rgba(255,45,149,0.4)]
                            ${!agent.id || processing.play
                                ? "opacity-50 cursor-not-allowed" 
                                : "hover:bg-[#ff4da6] hover:shadow-[0_0_20px_rgba(255,45,149,0.6)]"}
                        `}

                    >

                        {processing.play ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Play size={16} />
                        )}

                        {processing.play ? "Playing..." : "Play"}

                    </button>

                    <button

onClick={addPlaylist}

                        disabled={!agent.id || addingToPlaylist}
                        
                        className={`
                            flex
                            items-center
                            gap-2
                            rounded-lg
                            border
                            border-[#00f0ff]
                            bg-transparent
                            px-3
                            py-2
                            text-sm
                            text-[#00f0ff]
                            transition
                            ${!agent.id || addingToPlaylist
                                ? "opacity-50 cursor-not-allowed" 
                                : "hover:bg-[#00f0ff] hover:text-[#0a0a14]"}
                        `}
                    >

                        {addingToPlaylist ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Plus size={16} />
                        )}

                        {addingToPlaylist ? "Adding..." : "Playlist"}

                    </button>

                </div>

            </div>

        </Card>

    );

}