import {

    Trash2

} from "lucide-react";

import type {

    QueueItem

} from "../types/QueueItem";
import Card from "../../../shared/components/Card";

interface Props {

    item: QueueItem;

    active: boolean;

}

export default function QueueItemCard({

    item,

    active

}: Props) {

    return (

        <Card
            className={`
                transition-all
                ${
                    active && (

                        <span
                            className="
                                mb-2
                                inline-block
                                rounded-full
                                bg-red-600
                                px-2
                                py-1
                                text-xs
                                font-semibold
                                text-white
                            "
                        >
                            NOW PLAYING
                        </span>

                    )
                }
            `}
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

                <h3
                    className="
                        truncate
                        font-semibold
                    "
                >

                    {item.title}

                </h3>

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