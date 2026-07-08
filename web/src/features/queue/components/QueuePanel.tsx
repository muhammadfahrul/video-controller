import QueueEmpty from "./QueueEmpty";
import QueueItemCard from "./QueueItem";

import type {

    QueueItem

} from "../types/QueueItem";

interface Props {

    items: QueueItem[];

}

export default function QueuePanel({

    items

}: Props) {

    return (

        <section
            className="
                space-y-4
            "
        >

            <div
                className="
                    flex
                    items-center
                    justify-between
                "
            >

                <h2
                    className="
                        text-lg
                        font-bold
                    "
                >

                    Queue

                </h2>

                <span
                    className="
                        rounded-full
                        bg-red-500
                        px-3
                        py-1
                        text-xs
                        font-semibold
                        text-white
                    "
                >

                    {items.length}

                </span>

            </div>

            {

                items.length === 0

                ?

                <QueueEmpty />

                :

                <div
                    className="
                        space-y-3
                    "
                >

                    {

                        items.map(item=>

                            <QueueItemCard

                                key={item.id}

                                item={item}

                            />

                        )

                    }

                </div>

            }

        </section>

    );

}