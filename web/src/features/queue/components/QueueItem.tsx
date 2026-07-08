import {

    Trash2

} from "lucide-react";

import type {

    QueueItem

} from "../types/QueueItem";
import Card from "../../../shared/components/Card";

interface Props {

    item: QueueItem;

}

export default function QueueItemCard({

    item

}: Props) {

    return (

        <Card>

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