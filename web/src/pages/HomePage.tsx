import PlayerControls from "../features/player/components/PlayerControls";
// import PlayerStatus from "../features/player/components/PlayerStatus";
import ProgressBar from "../features/player/components/ProgressBar";
import VolumeSlider from "../features/player/components/VolumeSlider";
import CurrentVideo from "../features/player/components/CurrentVideo";
import { useAppStore } from "../store/appStore";
import { playerCommandService } from "../services";
import { usePlayer } from "../hooks/usePlayer";

export default function HomePage(){

    usePlayer();

    const { agent, player, setProcessing } = useAppStore();

    const handleVolumeChange = (value: number) => {
        if (!agent.id || !agent.online) return;
        setProcessing("volume", true);
        playerCommandService.volume(agent.id, value);
        setTimeout(() => setProcessing("volume", false), 300);
    };

    return (

        <div className="space-y-6 landscape:space-y-5">

            <CurrentVideo />

            {/* <PlayerStatus /> */}

            <ProgressBar />

            <PlayerControls />

            <VolumeSlider
                value={player.volume}
                disabled={!agent.online}
                onChange={handleVolumeChange}
            />

        </div>

    );

}