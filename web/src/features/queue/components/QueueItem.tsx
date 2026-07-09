import {

    Trash2,

    Play

} from "lucide-react";

import type {

    QueueItem

} from "../types/QueueItem";
import Card from "../../../shared/components/Card";

interface Props {

    item: QueueItem;

    active: boolean;

    onPlay(): void;

    onRemove(): void;

}

export default function QueueItemCard({

    item,

    active,

    onPlay,

    onRemove

}: Props) {

    return (

        <Card
            className="
                cursor-pointer
                transition
                hover:scale-[1.01]
            "
            onClick={onPlay}
        >

            <img

                src={item.thumbnail}

                alt={item.title}

                className="
                    h-16
                    w-24
                    rounded-lg
                    object-cover
                "

            />

            <div
                className="
                    min-w-0
                    flex-1
                "
            >

                <div
                    className="
                        flex
                        items-center
                        gap-2
                    "
                >

                    <h3
                        className="
                            flex-1
                            truncate
                            font-semibold
                        "
                    >

                        {item.title}

                    </h3>

                    {

                        active && (

                            <span
                                className="
                                    flex
                                    items-center
                                    gap-1
                                    rounded-full
                                    bg-red-500
                                    px-2
                                    py-1
                                    text-[10px]
                                    font-semibold
                                    text-white
                                    animate-pulse
                                "
                            >

                                <Play size={10} />

                                NOW

                            </span>

                        )

                    }

                </div>

                <p
                    className="
                        text-sm
                        text-gray-500
                    "
                >

                    {item.channel}

                </p>

                <p
                    className="
                        text-xs
                        text-gray-400
                    "
                >

                    {item.duration}

                </p>

            </div>

            <button
                onClick={(e)=>{

                    e.stopPropagation();

                    onRemove();

                }}

                className="
                    self-start
                    rounded-lg
                    p-2
                    text-red-500
                    transition
                    hover:bg-red-50
                "
            >

                <Trash2 size={18} />

            </button>

        </Card>

    );

}