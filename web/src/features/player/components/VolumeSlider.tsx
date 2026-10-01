import { Minus, Plus, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {

    value: number;

    disabled?: boolean;

    onChange(
        value:number
    ):void;

}

const STEP = 5;

export default function VolumeSlider({

    value,

    disabled,

    onChange

}:Props){

    const [

        localValue,

        setLocalValue

    ] = useState(value);

    useEffect(() => {

        setLocalValue(value);

    }, [value]);

    const applyStep = (delta: number) => {

        if (disabled) return;

        const next = Math.min(
            100,
            Math.max(
                0,
                localValue + delta
            )
        );

        setLocalValue(next);

        onChange(next);

    };

    return(

        <section
            className="
                rounded-xl
                bg-[#12121f]
                p-4
                shadow-[0_0_15px_rgba(0,240,255,0.1)]
                space-y-3
                landscape:p-3
                landscape:space-y-2
                border border-[#2a2a4a]
            "
        >

            <div
                className="
                    flex
                    items-center
                    gap-2
                "
            >

                <Volume2 size={18}/>

                <span>

                    Volume

                </span>

                <span
                    className="ml-auto"
                >

                    {value}%

                </span>

            </div>

            <div
                className="
                    flex
                    items-center
                    gap-2
                "
            >

                <button

                    type="button"

                    disabled={disabled || localValue <= 0}

                    onClick={()=> applyStep(-STEP)}

                    className="
                        flex
                        items-center
                        justify-center
                        w-8
                        h-8
                        shrink-0
                        rounded-lg
                        bg-[#1a1a2e]
                        border border-[#2a2a4a]
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                    "

                >

                    <Minus size={14}/>

                </button>

                <input

                    type="range"

                    min={0}

                    max={100}

                    value={localValue}

                    disabled={disabled}

                    onChange={e=>

                        setLocalValue(

                            Number(
                                e.target.value
                            )

                        )

                    }

                    onMouseUp={()=>{

                        if (!disabled) {

                            onChange(localValue);

                        }

                    }}

                    onTouchEnd={()=>{

                        if (!disabled) {

                            onChange(localValue);

                        }

                    }}

                    className={`
                        w-full
                        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}

                />

                <button

                    type="button"

                    disabled={disabled || localValue >= 100}

                    onClick={()=> applyStep(STEP)}

                    className="
                        flex
                        items-center
                        justify-center
                        w-8
                        h-8
                        shrink-0
                        rounded-lg
                        bg-[#1a1a2e]
                        border border-[#2a2a4a]
                        disabled:opacity-50
                        disabled:cursor-not-allowed
                    "

                >

                    <Plus size={14}/>

                </button>

            </div>

        </section>

    );

}