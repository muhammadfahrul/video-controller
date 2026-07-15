"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceContainer = void 0;
const BrowserManager_1 = require("../browser/BrowserManager");
const PlayerService_1 = require("../services/PlayerService");
const commands_1 = require("../commands");
const CommandService_1 = require("../services/CommandService");
const CommandRouter_1 = require("../network/CommandRouter");
class ServiceContainer {
    browser = new BrowserManager_1.BrowserManager();
    player = new PlayerService_1.PlayerService(this.browser);
    dispatcher = new commands_1.CommandDispatcher();
    commandService = new CommandService_1.CommandService(this.dispatcher);
    commandRouter = new CommandRouter_1.CommandRouter(this.commandService);
    constructor() {
        this.dispatcher.register(commands_1.CommandType.PLAY, new commands_1.PlayHandler(this.player));
        this.dispatcher.register(commands_1.CommandType.PAUSE, new commands_1.PauseHandler(this.player));
        this.dispatcher.register(commands_1.CommandType.VOLUME, new commands_1.VolumeHandler(this.player));
    }
    getBrowser() {
        return this.browser;
    }
    getPlayer() {
        return this.player;
    }
    getDispatcher() {
        return this.dispatcher;
    }
    getCommandRouter() {
        return this.commandRouter;
    }
}
exports.ServiceContainer = ServiceContainer;
