import { BrowserManager } from "../browser/BrowserManager";
import { PlayerService } from "../services/PlayerService";

import {
    CommandDispatcher,
    CommandType,
    PlayHandler,
    PauseHandler,
    VolumeHandler
} from "../commands";

import { CommandService } from "../services/CommandService";
import { CommandRouter } from "../network/CommandRouter";

export class ServiceContainer {

    private readonly browser =
        new BrowserManager();

    private readonly player =
        new PlayerService(
            this.browser
        );

    private readonly dispatcher =
        new CommandDispatcher();

    private readonly commandService =
        new CommandService(
            this.dispatcher
        );

    private readonly commandRouter =
        new CommandRouter(
            this.commandService
        );

    constructor() {

        this.dispatcher.register(
            CommandType.PLAY,
            new PlayHandler(
                this.player
            )
        );

        this.dispatcher.register(
            CommandType.PAUSE,
            new PauseHandler(
                this.player
            )
        );

        this.dispatcher.register(
            CommandType.VOLUME,
            new VolumeHandler(
                this.player
            )
        );

    }

    public getBrowser() {
        return this.browser;
    }

    public getPlayer() {
        return this.player;
    }

    public getDispatcher() {
        return this.dispatcher;
    }

    public getCommandRouter() {
        return this.commandRouter;
    }

}