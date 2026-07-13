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
    Plus

} from "lucide-react";

interface Props{

    result:
        SearchResult;

}

export default function SearchResultCard({

    result

}:Props){

    const {

        agent

    } = useAppStore();

    const play = () => {

        if (!agent.id) {

            return;

        }

        playerCommandService.openVideo(

            agent.id,

            result.videoId

        );

    };

    const addQueue = () => {

        if (!agent.id) {

            return;

        }

        playerCommandService.addQueue(

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

    };

    return(

        <Card>

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
                    "
                >

                    {result.title}

                </h3>

                <p
                    className="
                        mt-2
                        text-sm
                        text-gray-500
                    "
                >

                    {result.channel}

                </p>

                <p
                    className="
                        text-xs
                        text-gray-400
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

                        className="
                            flex
                            items-center
                            gap-2
                            rounded-lg
                            bg-red-600
                            px-3
                            py-2
                            text-sm
                            text-white
                            transition
                            hover:bg-red-700
                        "

                    >

                        <Play size={16} />

                        Play

                    </button>

                    <button

                        onClick={addQueue}
                        
                        className="
                            flex
                            items-center
                            gap-2
                            rounded-lg
                            border
                            px-3
                            py-2
                            text-sm
                            transition
                            hover:bg-gray-100
                        "
                    >

                        <Plus size={16} />

                        Queue

                    </button>

                </div>

            </div>

        </Card>

    );

}