import {

    Play,

    Pause,

    SkipBack,

    SkipForward,

    Square,

    VolumeX,

    Volume2,

    Maximize2,

    Minimize2

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

    const {

        player,

        agent

    } = useAppStore();

    let statusText = "Offline";

    let statusColor = "bg-gray-400";

    if (agent.online) {

        if (player.playing) {

            statusText = "Playing";

            statusColor = "bg-green-500";

        }

        else {

            statusText = "Paused";

            statusColor = "bg-yellow-500";

        }

    }

    let volumeText = "";

    if (player.muted) {

        volumeText = "Muted";

    }

    else {

        volumeText = `Volume ${player.volume}%`;

    }

    function handlePlayPause() {

        if (!agent.id) {

            return;

        }

        if (player.playing) {

            playerCommandService.pause(

                agent.id

            );

        }

        else {

            playerCommandService.play(

                agent.id

            );

        }

    }

    function handleMute() {

        if (!agent.id) {

            return;

        }

        if (player.muted) {

            playerCommandService.unmute(

                agent.id

            );

        }

        else {

            playerCommandService.mute(

                agent.id

            );

        }

    }

    function handleFullscreen() {

        if (!agent.id) {

            return;

        }

        if (player.fullscreen) {

            playerCommandService.exitFullscreen(

                agent.id

            );

        }

        else {

            playerCommandService.fullscreen(

                agent.id

            );

        }

    }

    function handleStop() {
        if (!agent.id) {

            return;
            
        }
        
        playerCommandService.stop(agent.id)
    }

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
                    flex
                    items-center
                    gap-2
                    text-sm
                "
            >

                <span
                    className={`
                        h-3
                        w-3
                        rounded-full
                        ${statusColor}
                    `}
                />

                <span>

                    {statusText}

                </span>

            </div>

            <div
                className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    text-gray-600
                "
            >

                <span>

                    {

                        player.muted

                            ?

                            "🔇"

                            :

                            "🔊"

                    }

                </span>

                <span>

                    {volumeText}

                </span>

            </div>

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

                    icon={

                        player.playing

                            ?

                            <Pause size={22}/>

                            :

                            <Play size={22}/>

                    }

                    label={

                        player.playing

                            ?

                            "Pause"

                            :

                            "Play"

                    }

                    variant="primary"

                    onClick={handlePlayPause}

                />

                <ControlButton

                    icon={<Square size={22}/>}

                    label="Stop"

                    variant="danger"

                    onClick={handleStop}

                />

                <ControlButton

                    icon={<SkipForward size={22}/>}

                    label="Next"

                />

                <ControlButton

                    icon={

                        player.muted

                            ? <VolumeX size={22}/>

                            : <Volume2 size={22}/>

                    }

                    label={

                        player.muted

                            ? "Unmute"

                            : "Mute"

                    }

                    onClick={handleMute}

                />

                <ControlButton

                    icon={

                        player.fullscreen

                            ? <Minimize2 size={22}/>

                            : <Maximize2 size={22}/>

                    }

                    label={

                        player.fullscreen

                            ? "Exit"

                            : "Fullscreen"

                    }

                    onClick={handleFullscreen}

                />

            </div>

        </section>

    );

}