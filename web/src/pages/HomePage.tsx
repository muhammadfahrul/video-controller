import PlayerControls from "../features/player/components/PlayerControls";
// import PlayerStatus from "../features/player/components/PlayerStatus";
import ProgressBar from "../features/player/components/ProgressBar";
import VolumeSlider from "../features/player/components/VolumeSlider";
import CurrentVideo from "../features/player/components/CurrentVideo";
import { useAppStore } from "../store/appStore";
import { playerCommandService } from "../services";

export default function HomePage() {

    const { agent, player } = useAppStore();

    return (

        <div className="space-y-5 tablet-landscape-text">

            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-400 tablet-landscape-text">Kendalikan lagu dan video karaoke dari tablet ini.</p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${agent.online ? "bg-teal-300/10 text-teal-200" : "bg-slate-800 text-slate-400"}`}>
                    {agent.online ? "Karaoke siap" : "Menunggu perangkat karaoke"}
                </span>
            </section>

            <CurrentVideo />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
                <div className="space-y-5">
                    <ProgressBar />
                    <PlayerControls />
                </div>

                <VolumeSlider
                    value={player.volume}
                    disabled={!agent.online}
                    onChange={(value) => {
                        if (!agent.id || !agent.online) return;
                        playerCommandService.volume(agent.id, value);
                    }}
                />
            </div>

        </div>

    );

}
