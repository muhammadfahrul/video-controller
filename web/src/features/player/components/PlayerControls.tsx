import {

    Play,

    Pause,

    SkipBack,

    SkipForward,

    Square,

    VolumeX,

    Maximize2

} from "lucide-react";

import ControlButton from "./ControlButton";

export default function PlayerControls() {

    return (

        <section
            className="
                space-y-4
            "
        >

            <h2
                className="
                    text-lg
                    font-bold
                "
            >

                Player Controls

            </h2>

            <div
                className="
                    grid
                    grid-cols-4
                    gap-3
                "
            >

                <ControlButton

                    icon={<SkipBack size={22}/>}

                    label="Prev"

                />

                <ControlButton

                    icon={<Play size={22}/>}

                    label="Play"

                    variant="primary"

                />

                <ControlButton

                    icon={<Pause size={22}/>}

                    label="Pause"

                />

                <ControlButton

                    icon={<Square size={22}/>}

                    label="Stop"

                    variant="danger"

                />

                <ControlButton

                    icon={<SkipForward size={22}/>}

                    label="Next"

                />

                <ControlButton

                    icon={<VolumeX size={22}/>}

                    label="Mute"

                />

                <ControlButton

                    icon={<Maximize2 size={22}/>}

                    label="Fullscreen"

                />

            </div>

        </section>

    );

}