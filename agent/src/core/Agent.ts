import {
 BrowserService
} from "../services/BrowserService";


import {
 PlayerService
} from "../services/PlayerService";


import {
 QueueService
} from "../services/QueueService";

import {
    SocketClient,
    AgentIdentityProvider,
    HeartbeatService,
    CommandRouter
} from "../network";

import {
    CommandService
} from "../services";

import {
    CommandDispatcher,
    CommandType,
    PlayHandler,
    PauseHandler,
    VolumeHandler,
    SeekHandler,
    MuteHandler,
    UnmuteHandler,
    StopHandler,
    OpenVideoHandler,
    NextHandler,
    PreviousHandler,
    AddQueueHandler,
    RemoveQueueHandler,
    ClearQueueHandler,
    PlayQueueItemHandler,
    ShuffleQueueHandler
} from "../commands";
import { FullscreenHandler } from "../commands/handlers/FullscreenHandler";
import { ExitFullscreenHandler } from "../commands/handlers/ExitFullscreenHandler";
import { ToggleFullscreenHandler } from "../commands/handlers/ToggleFullscreenHandler";
import { RepeatModeHandler } from "../commands/handlers/RepeatModeHandler";
import { RepeatMode } from "../queue/RepeatMode";
import { QueueRepository } from "../repositories/QueueRepository";
import { PlayerRepository } from "../repositories/PlayerRepository";
import { HealthService } from "../health/HealthService";
import { ConfigService } from "../services/ConfigService";


export class Agent {


    private browser:
        BrowserService;

    private health?: HealthService;


    private player?:
        PlayerService;

    private playerRepository =
        new PlayerRepository();


    private queue:
        QueueService;

    private socketClient?:
        SocketClient;


    private heartbeat?:
        HeartbeatService;

    private commandRouter?:
        CommandRouter;

    private commandDispatcher:
        CommandDispatcher;

    private playerStateTimer?: NodeJS.Timeout;

    private queueStateTimer?: NodeJS.Timeout;

    private identity:
    {
        id:string;
        name:string;
    };


    constructor() {

        this.browser =
            new BrowserService();

        this.queue =
            new QueueService();

        const repository =

            new QueueRepository();

        this.queue =

            new QueueService(
                repository
            );

        this.commandDispatcher =
            new CommandDispatcher();

        const commandService =
            new CommandService(
                this.commandDispatcher
            );

        this.commandRouter =
            new CommandRouter(
                commandService
            );

        const config =
            ConfigService
                .getInstance()
                .getConfig();

        this.identity =
            new AgentIdentityProvider()
                .get();

        const serverUrl =
            ConfigService
                .getInstance()
                .getServerUrl();

        this.socketClient =
            new SocketClient(
                serverUrl,
                this.identity,
                this.commandRouter
            );

    }




    async start() {

        const config =
            ConfigService
                .getInstance()
                .getConfig();


        await this.browser.start();

        this.player =
            new PlayerService(
                this.browser.getPage(),
                this.playerRepository
            );

        this.health = new HealthService(

            this.browser.getBrowserManager(),

            this.player

        );

        this.health.start(
            config.health.interval
        );

        const saved =

            await this.player.loadSnapshot();

        console.log(

            "[PLAYER RESTORE]",

            saved

        );

        await this.player.restore()

        this.player.setOnEnded(async () => {

            console.log(
                "[AGENT] Video ended"
            );

            const next =
                await this.queue.next();

            if (!next) {

                console.log(
                    "[QUEUE] No next item"
                );

                return;

            }

            console.log(

                "[QUEUE] Playing next",

                next.title

            );

            await this.player!
                .openVideo(
                    next.videoId
                );

        });

        this.registerCommands();

        await this.queue.load();

        console.log(
            "[QUEUE] Restored",
            this.queue.size(),
            "items"
        );

        this.socketClient!.connect();

        this.heartbeat =
            new HeartbeatService(
                this.socketClient!
            );

        this.heartbeat.start();

        this.startPlayerStateSync();

        this.sendCurrentQueue();

        this.startQueueSync();

    }




    getPlayer(){

        if(!this.player){

            throw new Error(
                "Player not ready"
            );

        }


        return this.player;

    }




    getQueue(){

        return this.queue;

    }


    private registerCommands() {

        if (!this.player) {

            throw new Error(
                "Player not initialized."
            );

        }

        this.commandDispatcher.register(
            CommandType.PLAY,
            new PlayHandler(this.player)
        );

        this.commandDispatcher.register(
            CommandType.PAUSE,
            new PauseHandler(this.player)
        );

        this.commandDispatcher.register(
            CommandType.VOLUME,
            new VolumeHandler(this.player)
        );

        this.commandDispatcher.register(
            CommandType.SEEK,
            new SeekHandler(
                this.player
            )
        );

        this.commandDispatcher.register(
            CommandType.MUTE,
            new MuteHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.UNMUTE,
            new UnmuteHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.STOP,
            new StopHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.OPEN_VIDEO,
            new OpenVideoHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.NEXT,
            new NextHandler(
                this.player!,
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.PREVIOUS,
            new PreviousHandler(
                this.player!,
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.FULLSCREEN,
            new FullscreenHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.EXIT_FULLSCREEN,
            new ExitFullscreenHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.TOGGLE_FULLSCREEN,
            new ToggleFullscreenHandler(
                this.player!
            )
        );

        this.commandDispatcher.register(
            CommandType.ADD_QUEUE,
            new AddQueueHandler(
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.REMOVE_QUEUE,
            new RemoveQueueHandler(
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.CLEAR_QUEUE,
            new ClearQueueHandler(
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.PLAY_QUEUE_ITEM,
            new PlayQueueItemHandler(
                this.player!,
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.SHUFFLE_QUEUE,
            new ShuffleQueueHandler(
                this.queue
            )
        );

        this.commandDispatcher.register(
            CommandType.REPEAT_OFF,
            new RepeatModeHandler(
                this.queue,
                RepeatMode.OFF
            )
        );

        this.commandDispatcher.register(
            CommandType.REPEAT_ONE,
            new RepeatModeHandler(
                this.queue,
                RepeatMode.ONE
            )
        );

        this.commandDispatcher.register(
            CommandType.REPEAT_ALL,
            new RepeatModeHandler(
                this.queue,
                RepeatMode.ALL
            )
        );
    }

    public getSocketClient() {

        return this.socketClient;

    }

    public getDispatcher() {

        return this.commandDispatcher;

    }

    public async stop() {

        this.heartbeat?.stop();

        await this.browser.stop();

        if (

            this.playerStateTimer

        ) {

            clearInterval(

                this.playerStateTimer

            );

        }

        if(
            this.queueStateTimer
        ){

            clearInterval(
                this.queueStateTimer
            );

        }

        this.health?.stop();
    }


    private startPlayerStateSync() {

        this.playerStateTimer = setInterval(

            async () => {

                try {

                    if (
                        !this.player ||
                        !this.socketClient
                    ) {

                        return;

                    }

                    const playerSnapshot =

                        await this.player
                            .getSnapshot();

                    const queueSnapshot =

                        this.queue
                            .getSnapshot();

                    this.socketClient
                        .sendPlayerState({

                            agentId:
                                this.identity.id,


                            player:
                                playerSnapshot,


                            queue:
                                queueSnapshot

                        });

                }

                catch (err) {

                    if (
                        err instanceof Error &&
                        err.message.includes("Execution context was destroyed")
                    ) {

                        // Halaman sedang berpindah, lewati siklus ini.
                        return;
                    }

                    console.error(err);

                }

            },

            1000

        );

    }


    private startQueueSync() {

        this.queueStateTimer =

            setInterval(

                () => {

                    const snapshot =

                        this.queue.getSnapshot();

                    this.socketClient

                        ?.sendQueueState(

                            snapshot

                        );

                },

                1000

            );

    }

    private sendCurrentQueue() {

        if (!this.socketClient) {

            return;

        }

        this.socketClient.sendQueueState(

            this.queue.getSnapshot()

        );

    }
}