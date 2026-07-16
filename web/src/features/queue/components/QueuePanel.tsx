import QueueEmpty from "./QueueEmpty";
import QueueItemCard from "./QueueItem";

import { useAppStore } from "../../../store/appStore";

import {
    playerCommandService
} from "../../../services";

import QueueToolbar
from "./QueueToolbar";

export default function QueuePanel() {

    const {

        agent,

        queue,
        removingItemId,
        setRemovingItemId,
        processing,
        setProcessing

    } = useAppStore();

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

                    Playlist

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

                    {queue.items.length}

                </span>

            </div>

            <QueueToolbar/>

            {

                queue.items.length === 0

                ?

                <QueueEmpty />

                :

                <div
                    className="
                        space-y-3
                    "
                >

                    {

                        queue.items.map((item,index)=>

                            <QueueItemCard

                                key={item.id}

                                item={item}

                                active={
                                    index === queue.currentIndex
                                }

                                removing={removingItemId === item.id}
                                
                                disabled={processing.removeFromQueue}

                                onPlay={()=>{

                                    playerCommandService
                                        .playQueueItem(

                                            agent.id,

                                            item.id

                                        );

                                }}

                                onRemove={()=>{

                                    // Set removing state
                                    setRemovingItemId(item.id);
                                    
                                    // Set processing state
                                    setProcessing("removeFromQueue", true);
                                    
                                    // Kirim perintah ke server - tunggu response sebelum update UI
                                    playerCommandService
                                        .removeQueue(

                                            agent.id,

                                            item.id

                                        );

                                    setTimeout(() => {
                                        setRemovingItemId(null);
                                        setProcessing("removeFromQueue", false);
                                    }, 500);

                                }}

                            />

                        )

                    }

                </div>

            }

        </section>

    );

}