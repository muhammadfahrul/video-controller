"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const BrowserService_1 = require("../services/BrowserService");
const PlayerService_1 = require("../services/PlayerService");
const QueueService_1 = require("../services/QueueService");
const network_1 = require("../network");
const services_1 = require("../services");
const commands_1 = require("../commands");
const FullscreenHandler_1 = require("../commands/handlers/FullscreenHandler");
const ExitFullscreenHandler_1 = require("../commands/handlers/ExitFullscreenHandler");
const ToggleFullscreenHandler_1 = require("../commands/handlers/ToggleFullscreenHandler");
const RepeatModeHandler_1 = require("../commands/handlers/RepeatModeHandler");
const SkipAdHandler_1 = require("../commands/handlers/SkipAdHandler");
const RepeatMode_1 = require("../queue/RepeatMode");
const QueueRepository_1 = require("../repositories/QueueRepository");
const PlayerRepository_1 = require("../repositories/PlayerRepository");
const HealthService_1 = require("../health/HealthService");
const ConfigService_1 = require("../services/ConfigService");
class Agent {
    browser;
    health;
    player;
    playerRepository = new PlayerRepository_1.PlayerRepository();
    queue;
    socketClient;
    heartbeat;
    commandRouter;
    commandDispatcher;
    playerStateTimer;
    queueStateTimer;
    adSkipTimer;
    autoSkipEnabled = true;
    identity;
    constructor() {
        this.browser =
            new BrowserService_1.BrowserService();
        const queueRepository = new QueueRepository_1.QueueRepository();
        this.queue =
            new QueueService_1.QueueService(queueRepository);
        this.commandDispatcher =
            new commands_1.CommandDispatcher();
        const commandService = new services_1.CommandService(this.commandDispatcher);
        this.commandRouter =
            new network_1.CommandRouter(commandService);
        const config = ConfigService_1.ConfigService
            .getInstance()
            .getConfig();
        this.identity =
            new network_1.AgentIdentityProvider()
                .get();
        const serverUrl = ConfigService_1.ConfigService
            .getInstance()
            .getServerUrl();
        this.socketClient =
            new network_1.SocketClient(serverUrl, this.identity, this.commandRouter);
    }
    async start() {
        const config = ConfigService_1.ConfigService
            .getInstance()
            .getConfig();
        await this.browser.start();
        this.player =
            new PlayerService_1.PlayerService(this.browser.getPage(), this.playerRepository);
        this.health = new HealthService_1.HealthService(this.browser.getBrowserManager(), this.player);
        this.health.start(config.health.interval);
        const saved = await this.player.loadSnapshot();
        console.log("[PLAYER RESTORE]", saved);
        await this.player.restore();
        // If no saved video, open YouTube home
        const snapshot = await this.player.getSnapshot();
        if (!snapshot || !snapshot.videoId) {
            console.log("[AGENT] No saved video, opening YouTube home");
            await this.player.openVideo("");
        }
        // Enter fullscreen on startup
        await this.player.fullscreen();
        this.player.setOnEnded(async () => {
            console.log("[AGENT] Video ended");
            const next = await this.queue.next();
            if (!next) {
                console.log("[QUEUE] No next item");
                return;
            }
            console.log("[QUEUE] Playing next", next.title);
            await this.player
                .openVideo(next.videoId);
        });
        this.registerCommands();
        await this.queue.load();
        console.log("[QUEUE] Restored", this.queue.size(), "items");
        this.socketClient.connect();
        this.heartbeat =
            new network_1.HeartbeatService(this.socketClient);
        this.heartbeat.start();
        this.startPlayerStateSync();
        this.sendCurrentQueue();
        this.startQueueSync();
        this.startAutoSkipAds();
    }
    getPlayer() {
        if (!this.player) {
            throw new Error("Player not ready");
        }
        return this.player;
    }
    getQueue() {
        return this.queue;
    }
    registerCommands() {
        if (!this.player) {
            throw new Error("Player not initialized.");
        }
        this.commandDispatcher.register(commands_1.CommandType.PLAY, new commands_1.PlayHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.PAUSE, new commands_1.PauseHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.VOLUME, new commands_1.VolumeHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.SEEK, new commands_1.SeekHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.MUTE, new commands_1.MuteHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.UNMUTE, new commands_1.UnmuteHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.STOP, new commands_1.StopHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.OPEN_VIDEO, new commands_1.OpenVideoHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.NEXT, new commands_1.NextHandler(this.player, this.queue));
        this.commandDispatcher.register(commands_1.CommandType.PREVIOUS, new commands_1.PreviousHandler(this.player, this.queue));
        this.commandDispatcher.register(commands_1.CommandType.FULLSCREEN, new FullscreenHandler_1.FullscreenHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.EXIT_FULLSCREEN, new ExitFullscreenHandler_1.ExitFullscreenHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.TOGGLE_FULLSCREEN, new ToggleFullscreenHandler_1.ToggleFullscreenHandler(this.player));
        this.commandDispatcher.register(commands_1.CommandType.ADD_QUEUE, new commands_1.AddQueueHandler(this.queue));
        this.commandDispatcher.register(commands_1.CommandType.REMOVE_QUEUE, new commands_1.RemoveQueueHandler(this.queue));
        this.commandDispatcher.register(commands_1.CommandType.CLEAR_QUEUE, new commands_1.ClearQueueHandler(this.queue));
        this.commandDispatcher.register(commands_1.CommandType.PLAY_QUEUE_ITEM, new commands_1.PlayQueueItemHandler(this.player, this.queue));
        this.commandDispatcher.register(commands_1.CommandType.SHUFFLE_QUEUE, new commands_1.ShuffleQueueHandler(this.queue));
        this.commandDispatcher.register(commands_1.CommandType.REPEAT_OFF, new RepeatModeHandler_1.RepeatModeHandler(this.queue, RepeatMode_1.RepeatMode.OFF));
        this.commandDispatcher.register(commands_1.CommandType.REPEAT_ONE, new RepeatModeHandler_1.RepeatModeHandler(this.queue, RepeatMode_1.RepeatMode.ONE));
        this.commandDispatcher.register(commands_1.CommandType.REPEAT_ALL, new RepeatModeHandler_1.RepeatModeHandler(this.queue, RepeatMode_1.RepeatMode.ALL));
        this.commandDispatcher.register(commands_1.CommandType.SKIP_AD, new SkipAdHandler_1.SkipAdHandler(this.player));
    }
    getSocketClient() {
        return this.socketClient;
    }
    getDispatcher() {
        return this.commandDispatcher;
    }
    async stop() {
        this.heartbeat?.stop();
        await this.browser.stop();
        if (this.playerStateTimer) {
            clearInterval(this.playerStateTimer);
        }
        if (this.queueStateTimer) {
            clearInterval(this.queueStateTimer);
        }
        this.stopAutoSkipAds();
        this.health?.stop();
    }
    startPlayerStateSync() {
        this.playerStateTimer = setInterval(async () => {
            try {
                if (!this.player ||
                    !this.socketClient) {
                    return;
                }
                const playerSnapshot = await this.player
                    .getSnapshot();
                const queueSnapshot = this.queue
                    .getSnapshot();
                this.socketClient
                    .sendPlayerState({
                    agentId: this.identity.id,
                    player: playerSnapshot,
                    queue: queueSnapshot
                });
            }
            catch (err) {
                if (err instanceof Error &&
                    err.message.includes("Execution context was destroyed")) {
                    // Halaman sedang berpindah, lewati siklus ini.
                    return;
                }
                console.error(err);
            }
        }, 1000);
    }
    startAutoSkipAds() {
        this.adSkipTimer = setInterval(async () => {
            try {
                if (!this.autoSkipEnabled ||
                    !this.player) {
                    return;
                }
                // Skip ad if possible
                const skipped = await this.player.skipAd();
                if (skipped) {
                    console.log("[Agent] Auto-skipped ad");
                }
            }
            catch (err) {
                // Ignore errors in auto-skip
                console.log("[Agent] Auto-skip error (ignored):", err);
            }
        }, 
        // Check every 500ms for ads
        500);
    }
    stopAutoSkipAds() {
        if (this.adSkipTimer) {
            clearInterval(this.adSkipTimer);
            this.adSkipTimer = undefined;
        }
    }
    startQueueSync() {
        this.queueStateTimer =
            setInterval(() => {
                const snapshot = this.queue.getSnapshot();
                this.socketClient
                    ?.sendQueueState(snapshot);
            }, 1000);
    }
    sendCurrentQueue() {
        if (!this.socketClient) {
            return;
        }
        this.socketClient.sendQueueState(this.queue.getSnapshot());
    }
}
exports.Agent = Agent;
