import {
    useState
} from "react";


import {
    useAppStore
} from "../../../store/appStore";


import {
    playerCommandService
} from "../../../services/player";


export default function ProgressBar(){


    const {
        player,
        agent
    } = useAppStore();


    const [seeking,setSeeking] =
        useState(false);



    const value =
        seeking
        ?
        undefined
        :
        player.currentTime;



    function handleSeek(
        e:React.ChangeEvent<HTMLInputElement>
    ){


        const time =
            Number(
                e.target.value
            );


        setSeeking(true);


        playerCommandService
            .seek(

                agent.id,

                time

            );


    }



    function handleChangeEnd(){


        setSeeking(false);


    }



    return (

        <div
            className="
                space-y-2
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
                    text-gray-500
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