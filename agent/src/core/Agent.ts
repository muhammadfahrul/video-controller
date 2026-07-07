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
    VolumeHandler
} from "../commands";


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



    constructor(){


        this.browser =
            new BrowserService();



        this.queue =
            new QueueService();

        const identity =
            new AgentIdentityProvider()
            .get();



        this.socketClient =
            new SocketClient(
                "http://localhost:3000",
                identity
            );

        const commandService =
            new CommandService(
                this.commandDispatcher
            );

        this.commandDispatcher =
            new CommandDispatcher();

        this.commandDispatcher.register(

            CommandType.PLAY,

            new PlayHandler(
                this.player
            )

        );


        this.commandRouter =
            new CommandRouter(
                commandService
            );

    }




    async start(){


        await this.browser.start();



        this.player =
            new PlayerService(
                this.browser.getPage()
            );

        this.registerCommands();

        this.socketClient
            .connect();



        this.heartbeat =
            new HeartbeatService(
                this.socketClient
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


    private registerCommands(){


        this.commandDispatcher.register(

            CommandType.PLAY,

            new PlayHandler(
                this.player!
            )

        );


        this.commandDispatcher.register(

            CommandType.PAUSE,

            new PauseHandler(
                this.player!
            )

        );


        this.commandDispatcher.register(

            CommandType.VOLUME,

            new VolumeHandler(
                this.player!
            )

        );


    }



}