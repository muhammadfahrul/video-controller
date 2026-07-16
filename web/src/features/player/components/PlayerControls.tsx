import {

    Play,

    Pause,

    SkipBack,

    SkipForward,

    Square,

    VolumeX,

    Volume2,

    Maximize2,

    Minimize2,

    FastForward

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

    const { } = usePlayerControls();

    const {

        player,

        agent,

        processing,

        setProcessing

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

    const disabled = !agent.online;

    function handlePlayPause() {

        if (!agent.id) {

            return;

        }

        const action = player.playing ? "pause" : "play";
        
        setProcessing(action, true);

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

        setTimeout(() => setProcessing(action, false), 500);

    }

    function handleMute() {

        if (!agent.id) {

            return;

        }

        setProcessing("mute", true);

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

        setTimeout(() => setProcessing("mute", false), 500);

    }

    function handleFullscreen() {

        if (!agent.id) {

            return;

        }

        setProcessing("fullscreen", true);

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

        setTimeout(() => setProcessing("fullscreen", false), 500);

    }

    function handleStop() {
        if (!agent.id) {

            return;
            
        }
        
        setProcessing("stop", true);
        playerCommandService.stop(agent.id);
        setTimeout(() => setProcessing("stop", false), 500);
    }

    function handleNext() {
        if (!agent.id) {

            return;
            
        }
        
        setProcessing("next", true);
        playerCommandService.next(agent.id);
        setTimeout(() => setProcessing("next", false), 500);
    }

    function handlePrev() {
        if (!agent.id) {

            return;
            
        }
        
        setProcessing("previous", true);
        playerCommandService.previous(agent.id);
        setTimeout(() => setProcessing("previous", false), 500);
    }

    function handleSkipAd() {
        if (!agent.id) {

            return;
            
        }
        
        setProcessing("skipAd", true);
        playerCommandService.skipAd(agent.id);
        setTimeout(() => setProcessing("skipAd", false), 500);
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

                    onClick={handlePrev}

                    disabled={disabled || processing.previous}

                    loading={processing.previous}

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

                    disabled={disabled || processing.play || processing.pause}

                    loading={processing.play || processing.pause}

                />

                <ControlButton

                    icon={<Square size={22}/>}

                    label="Stop"

                    variant="danger"

                    onClick={handleStop}

                    disabled={disabled || processing.stop}

                    loading={processing.stop}

                />

                <ControlButton

                    icon={<SkipForward size={22}/>}

                    label="Next"

                    onClick={handleNext}

                    disabled={disabled || processing.next}

                    loading={processing.next}

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

                    disabled={disabled || processing.mute}

                    loading={processing.mute}

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

                    disabled={disabled || processing.fullscreen}

                    loading={processing.fullscreen}

                />

                <ControlButton

                    icon={<FastForward size={22}/>}

                    label="Skip Ad"

                    onClick={handleSkipAd}

                    disabled={disabled || processing.skipAd}

                    loading={processing.skipAd}

                />

            </div>

        </section>

    );

}