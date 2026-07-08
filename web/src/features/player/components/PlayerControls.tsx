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

import {

    playerCommandService

} from "../../../services";

import {

    useAppStore

} from "../../../store/appStore";

import {

    usePlayerControls

} from "../../../hooks/usePlayerControls";

export default function PlayerControls() {

    const {

        play,

        pause

    } = usePlayerControls();

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

                    onClick={play}

                />

                <ControlButton

                    icon={<Pause size={22}/>}

                    label="Pause"

                    onClick={pause}

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