import {
    useState,
    useEffect
} from "react";


import {
    useAgentState,
    usePlayerState
} from "../../../hooks/useAppState";

import {
    useLoading
} from "../../../context/LoadingContext";


import {
    playerCommandService
} from "../../../services/player";


export default function ProgressBar(){


    const player = usePlayerState();
    const agent = useAgentState();
    const { setProcessing } = useLoading();


    const [localValue, setLocalValue] =
        useState(player.currentTime);


    useEffect(() => {

        setLocalValue(player.currentTime);

    }, [player.currentTime]);


    const value = localValue;


    function handleSeek(
        e:React.ChangeEvent<HTMLInputElement>
    ){


        const time =
            Number(
                e.target.value
            );


        setLocalValue(time);


    }


    function handleChangeEnd(){

        if (!agent.online) return;

        setProcessing("seek", true);
        
        playerCommandService
            .seek(

                agent.id,

                localValue

            );

        setTimeout(() => setProcessing("seek", false), 300);

    }



    return (

        <div
            className="
                space-y-2
                bg-[#12121f]
                p-4
                rounded-xl
                border border-[#2a2a4a]
                shadow-[0_0_15px_rgba(255,45,149,0.1)]
            "
        >


            <input

                type="range"

                min="0"

                max={
                    player.duration || 0
                }

                value={
                    value ??
                    player.currentTime
                }

                onChange={
                    handleSeek
                }

                onMouseUp={
                    handleChangeEnd
                }

                onTouchEnd={
                    handleChangeEnd
                }

                className="
                    w-full
                "

            />



            <div
                className="
                    flex
                    justify-between
                    text-xs
                    text-[#b8b8d0]
                "
            >

                <span>
                    {
                        formatTime(
                            player.currentTime
                        )
                    }
                </span>


                <span>
                    {
                        formatTime(
                            player.duration
                        )
                    }
                </span>


            </div>


        </div>

    );

}



function formatTime(
    seconds:number
){

    if (

        !Number.isFinite(seconds)

    ) {

        return "00:00";

    }

    const min =
        Math.floor(
            seconds / 60
        );


    const sec =
        Math.floor(
            seconds % 60
        )
        .toString()
        .padStart(
            2,
            "0"
        );


    return `${min}:${sec}`;

}