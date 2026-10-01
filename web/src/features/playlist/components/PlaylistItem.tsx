import {

    Trash2,

    Play,

    Loader2,

    ChevronUp,

    ChevronDown

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

    onMoveUp(): void;

    onMoveDown(): void;

    removing?: boolean;

    disabled?: boolean;

    canMoveUp?: boolean;

    canMoveDown?: boolean;

    moving?: boolean;

}

export default function PlaylistItemCard({

    item,

    active,

    onPlay,

    onRemove,

    onMoveUp,

    onMoveDown,

    removing = false,

    disabled = false,

    canMoveUp = false,

    canMoveDown = false,

    moving = false

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
                                    bg-[#ff2d95]
                                    px-2
                                    py-1
                                    text-[10px]
                                    font-semibold
                                    text-white
                                    animate-pulse
                                    shadow-[0_0_10px_rgba(255,45,149,0.6)]
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
                        text-[#b8b8d0]
                    "
                >

                    {item.channel}

                </p>

                <p
                    className="
                        text-xs
                        text-[#a855f7]
                    "
                >

                    {item.duration}

                </p>

            </div>

            <div
                className="
                    flex
                    items-center
                    gap-1
                    self-start
                "
                onClick={(e) => e.stopPropagation()}
            >

                <button
                    onClick={() => onMoveUp()}

                    disabled={!canMoveUp || moving || disabled}

                    className={`
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        text-[#00f0ff]
                        transition
                        ${!canMoveUp || moving || disabled
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:bg-[#00f0ff]/10"}
                    `}
                >

                    <ChevronUp size={16} />

                </button>

                <button
                    onClick={() => onMoveDown()}

                    disabled={!canMoveDown || moving || disabled}

                    className={`
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        text-[#00f0ff]
                        transition
                        ${!canMoveDown || moving || disabled
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:bg-[#00f0ff]/10"}
                    `}
                >

                    <ChevronDown size={16} />

                </button>

                <button
                    onClick={() => onRemove()}

                    disabled={removing || disabled}

                    className={`
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        text-red-500
                        transition
                        ${removing || disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-red-500/10"}
                    `}
                >

                    {removing || disabled ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Trash2 size={18} />
                    )}

                </button>

            </div>

        </Card>

    );

}