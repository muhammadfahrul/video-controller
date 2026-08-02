import { Volume2 } from "lucide-react";
import { useState } from "react";

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

    const [dragValue, setDragValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);

    const displayValue = isDragging ? dragValue : value;

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

            <input

                type="range"

                min={0}

                max={100}

                value={displayValue}

                disabled={disabled}

                onChange={e=>{
 
                    setDragValue(
 
                        Number(
                            e.target.value
                        )
 
                    );
                    setIsDragging(true);
 
                }}

                onMouseUp={() => {

                    if (!disabled) {
                        setIsDragging(false);
                        onChange(displayValue);
                    }

                }}

                onTouchEnd={() => {

                    if (!disabled) {
                        setIsDragging(false);
                        onChange(displayValue);
                    }

                }}

                className={`
                    w-full
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}

            />

        </section>

    );

}