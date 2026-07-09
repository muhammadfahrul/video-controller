import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../../store/appStore";
import {

    playerCommandService

} from "../../../services";

export default function PlayerProgress() {

    const {

        player,

        agent

    } = useAppStore();

    const progress = useMemo(() => {

        if (player.duration <= 0) {

            return 0;

        }

        return (

            player.currentTime /

            player.duration

        ) * 100;

    }, [

        player.currentTime,

        player.duration

    ]);

    const handleSeek = async () => {

        if (

            player.duration <= 0 ||

            !agent.id

        ) {

            return;

        }

        const seconds =

            player.duration *

            value /

            100;

        try {

            await playerCommandService.seek(
                agent.id,
                seconds
            );

        }

        catch (err) {

            console.error(err);

        }

    };

    const [value, setValue] = useState(progress);

    useEffect(() => {

        setValue(progress);

    }, [progress]);

    return (

        <section
            className="
                rounded-xl
                bg-white
                p-4
                shadow
                space-y-2
            "
        >

            <input

                type="range"

                min={0}

                max={100}

                value={value}

                onChange={(e) =>

                    setValue(

                        Number(e.target.value)

                    )

                }

                onMouseUp={handleSeek}

                onTouchEnd={handleSeek}

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

                    {player.currentTime.toFixed(1)} s

                </span>

                <span>

                    {player.duration.toFixed(1)} s

                </span>

            </div>

        </section>

    );

}