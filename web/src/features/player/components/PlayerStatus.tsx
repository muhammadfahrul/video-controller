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
                bg-white
                p-4
                shadow
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

                    player.currentTime.toFixed(1)

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