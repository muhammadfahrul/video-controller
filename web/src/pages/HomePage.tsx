import PlayerControls from "../features/player/components/PlayerControls";
import PlayerStatus from "../features/player/components/PlayerStatus";
import ProgressBar from "../features/player/components/ProgressBar";
import VolumeSlider from "../features/player/components/VolumeSlider";
import { useAppStore } from "../store/appStore";
import { playerCommandService } from "../services";
import { useAgent } from "../hooks/useAgent";
import { usePlayer } from "../hooks/usePlayer";

export default function HomePage(){

    useAgent();
    usePlayer();

    const { agent, player } = useAppStore();

    return (

        <div className="space-y-6">

            <PlayerStatus />

            <ProgressBar />

            <PlayerControls />

            <VolumeSlider
                value={player.volume}
                disabled={!agent.online}
                onChange={(value) => {
                    if (!agent.id) return;
                    playerCommandService.volume(agent.id, value);
                }}
            />

        </div>

    );

}