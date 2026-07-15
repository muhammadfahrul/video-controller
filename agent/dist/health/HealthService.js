"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const LoggerService_1 = require("../services/LoggerService");
const BrowserHealthCheck_1 = require("./BrowserHealthCheck");
const HealthScheduler_1 = require("./HealthScheduler");
const HealthStatus_1 = require("./HealthStatus");
const PageHealthCheck_1 = require("./PageHealthCheck");
const VideoHealthCheck_1 = require("./VideoHealthCheck");
const PlayerHealthCheck_1 = require("./PlayerHealthCheck");
class HealthService {
    browser;
    player;
    scheduler = new HealthScheduler_1.HealthScheduler();
    browserCheck;
    pageCheck;
    videoCheck;
    playerCheck;
    previousStatus = HealthStatus_1.HealthStatus.HEALTHY;
    snapshot = {
        status: HealthStatus_1.HealthStatus.HEALTHY,
        browser: true,
        page: true,
        video: true,
        player: true,
        timestamp: Date.now()
    };
    totalChecks = 0;
    totalFailures = 0;
    consecutiveFailures = 0;
    lastHealthyAt = Date.now();
    constructor(browser, player) {
        this.browser = browser;
        this.player = player;
        this.browserCheck =
            new BrowserHealthCheck_1.BrowserHealthCheck(browser);
        this.pageCheck =
            new PageHealthCheck_1.PageHealthCheck(browser);
        this.videoCheck =
            new VideoHealthCheck_1.VideoHealthCheck(player);
        this.playerCheck =
            new PlayerHealthCheck_1.PlayerHealthCheck(player);
    }
    start(interval) {
        this.scheduler.start(interval, async () => {
            await this.check();
        });
    }
    stop() {
        this.scheduler.stop();
    }
    async check() {
        this.totalChecks++;
        const browserHealthy = await this.browserCheck.check();
        if (!browserHealthy) {
            LoggerService_1.LoggerService.error("[HEALTH] Browser unhealthy");
        }
        const pageHealthy = await this.pageCheck.check();
        if (!pageHealthy) {
            LoggerService_1.LoggerService.error("[HEALTH] Page unhealthy");
        }
        const videoHealthy = await this.videoCheck.check();
        if (!videoHealthy) {
            LoggerService_1.LoggerService.error("[HEALTH] Video element missing");
        }
        const playerHealthy = await this.playerCheck.check();
        if (!playerHealthy) {
            LoggerService_1.LoggerService.error("[HEALTH] Player unhealthy");
        }
        const healthy = browserHealthy &&
            pageHealthy &&
            videoHealthy &&
            playerHealthy;
        if (healthy) {
            this.consecutiveFailures = 0;
            this.lastHealthyAt = Date.now();
        }
        else {
            this.totalFailures++;
            this.consecutiveFailures++;
            LoggerService_1.LoggerService.warn(`[HEALTH] Consecutive failures: ${this.consecutiveFailures}`);
        }
        this.snapshot = {
            status: browserHealthy && pageHealthy && videoHealthy && playerHealthy
                ?
                    HealthStatus_1.HealthStatus.HEALTHY
                :
                    HealthStatus_1.HealthStatus.ERROR,
            browser: browserHealthy,
            page: pageHealthy,
            video: videoHealthy,
            player: playerHealthy,
            timestamp: Date.now()
        };
        console.log("[HEALTH]", this.snapshot);
        if (this.snapshot.status !==
            this.previousStatus) {
            LoggerService_1.LoggerService.warn(`[HEALTH] ${this.previousStatus} -> ${this.snapshot.status}`);
            this.previousStatus =
                this.snapshot.status;
        }
    }
    getSnapshot() {
        return this.snapshot;
    }
    getMetrics() {
        return {
            totalChecks: this.totalChecks,
            totalFailures: this.totalFailures,
            consecutiveFailures: this.consecutiveFailures,
            lastHealthyAt: this.lastHealthyAt
        };
    }
    shouldRecover() {
        return this.consecutiveFailures >= 3;
    }
}
exports.HealthService = HealthService;
