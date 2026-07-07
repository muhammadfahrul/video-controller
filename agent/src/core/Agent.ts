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
    ClearQueueHandler
} from "../commands";
import { FullscreenHandler } from "../commands/handlers/FullscreenHandler";
import { ExitFullscreenHandler } from "../commands/handlers/ExitFullscreenHandler";
import { ToggleFullscreenHandler } from "../commands/handlers/ToggleFullscreenHandler";


export class Agent {


    private browser:
        BrowserService;


    private player?:
        PlayerService;


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



    constructor() {

        this.browser =
            new BrowserService();

        this.queue =
            new QueueService();

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

        const identity =
            new AgentIdentityProvider()
                .get();

        this.socketClient =
            new SocketClient(
                "http://localhost:3000",
                identity,
                this.commandRouter
            );

    }




    async start() {

        await this.browser.start();

        this.player =
            new PlayerService(
                this.browser.getPage()
            );

        this.registerCommands();

        this.socketClient!.connect();

        this.heartbeat =
            new HeartbeatService(
                this.socketClient!
            );

        this.heartbeat.start();

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

    }

}