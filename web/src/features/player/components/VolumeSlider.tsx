import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {

    value: number;

    disabled?: boolean;

    onChange(
        value:number
    ):void;

}

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

    return(

        <section
            className="
                rounded-xl
                bg-white
                p-4
                shadow
                space-y-3
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

                    onChange(localValue);

                }}

                onTouchEnd={()=>{

                    onChange(localValue);

                }}

                className="
                    w-full
                "

            />

        </section>

    );

}