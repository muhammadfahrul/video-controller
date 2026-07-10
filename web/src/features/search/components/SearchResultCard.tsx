import Card from "../../../shared/components/Card";
import type {

    SearchResult

} from "../types/SearchResult";

import { useAppStore } from "../../../store/appStore";

import {

    playerCommandService

} from "../../../services/player";

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

            console.warn(
                "No agent selected."
            );

            return;

        }

        console.log("Result", result)

        playerCommandService.openVideo(

            agent.id,

            result.videoId

        );

    };

    return(

        <Card>

            <img

                src={result.thumbnail}

                alt={result.title}

                className="
                    h-20
                    w-32
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
                        mt-3
                    "
                >

                    <button

                        onClick={play}

                        className="
                            rounded-lg
                            bg-red-600
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-red-700
                        "

                    >

                        ▶ Play

                    </button>

                </div>

            </div>

        </Card>

    );

}