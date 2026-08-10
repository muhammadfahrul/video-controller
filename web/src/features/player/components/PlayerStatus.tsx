import {

    useAppStore

} from "../../../store/appStore";

export default function PlayerStatus() {

    const {

        player

    } = useAppStore();

    return (

        <div
            className="
                rounded-xl
                bg-[#12121f]
                p-4
                shadow-[0_0_15px_rgba(255,45,149,0.1)]
                border border-[#2a2a4a]
            "
        >

            <div>

                Status :

                <strong>

                    {

                        player.playing

                            ? " Playing"

                            : " Paused"

                    }

                </strong>

            </div>

            <div>

                Volume :

                {player.volume}

            </div>

            <div>

                Time :

                {

                    (player.currentTime ?? 0).toFixed(1)

                }

                /

                {

                    (player.duration ?? 0).toFixed(1)

                }

            </div>

            <div>

                Fullscreen :

                {

                    player.fullscreen

                        ? " Yes"

                        : " No"

                }

            </div>

        </div>

    );

}