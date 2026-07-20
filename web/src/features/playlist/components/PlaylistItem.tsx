import {

    Trash2,

    Play,

    Loader2

} from "lucide-react";

import type {

    PlaylistItem

} from "../types/PlaylistItem";
import Card from "../../../shared/components/Card";



interface Props {

    item: PlaylistItem;

    active: boolean;

    onPlay(): void;

    onRemove(): void;

    removing?: boolean;
    
    disabled?: boolean;

}

export default function PlaylistItemCard({

    item,

    active,

    onPlay,

    onRemove,

    removing = false,
    
    disabled = false

}: Props) {

    return (

        <Card
            className="
                cursor-pointer
                transition
                hover:scale-[1.01]
                landscape:flex
                landscape:items-center
                landscape:gap-3
            "
            onClick={onPlay}
        >

            <img

                src={item.thumbnail}

                alt={item.title}

                className="
                    h-16
                    w-100
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

                disabled={removing || disabled}

                className={`
                    self-start
                    rounded-lg
                    p-2
                    text-red-500
                    transition
                    ${removing || disabled
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-red-50"}
                `}
            >

                {removing || disabled ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : (
                    <Trash2 size={18} />
                )}

            </button>

        </Card>

    );

}