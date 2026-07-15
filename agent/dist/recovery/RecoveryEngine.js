"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryEngine = void 0;
const RecoveryAction_1 = require("./RecoveryAction");
const RecoveryState_1 = require("./RecoveryState");
const LoggerService_1 = require("../services/LoggerService");
class RecoveryEngine {
    context;
    snapshot = {
        state: RecoveryState_1.RecoveryState.IDLE,
        lastAction: RecoveryAction_1.RecoveryAction.NONE,
        recoveryCount: 0
    };
    lastSnapshot;
    recovering = false;
    constructor(context) {
        this.context = context;
    }
    getSnapshot() {
        return {
            ...this.snapshot
        };
    }
    isRecovering() {
        return this.snapshot.state === RecoveryState_1.RecoveryState.RUNNING;
    }
    async recover(action) {
        const started = performance.now();
        LoggerService_1.LoggerService.info(`[RECOVERY] Start ${action}`);
        this.snapshot.state =
            RecoveryState_1.RecoveryState.RUNNING;
        this.snapshot.lastAction =
            action;
        this.snapshot.recoveryCount++;
        this.snapshot.lastRecoveryAt =
            Date.now();
        if (this.recovering) {
            LoggerService_1.LoggerService.warn("[RECOVERY] Already running");
            return {
                action,
                success: false,
                timestamp: Date.now()
            };
        }
        this.recovering = true;
        try {
            await this.captureSnapshot();
            switch (action) {
                case RecoveryAction_1.RecoveryAction.RELOAD_PAGE:
                    await this.reloadPage();
                    await this.restoreVideo();
                    await this.restorePosition();
                    await this.restoreSettings();
                    await this.context.browser.getPage().waitForTimeout(300);
                    await this.restorePlayback();
                default:
                    LoggerService_1.LoggerService.warn("Unknown recovery");
                    break;
            }
            LoggerService_1.LoggerService.info(`[RECOVERY] Finished ${action}`);
            LoggerService_1.LoggerService.info(`[RECOVERY] Finished in ${performance.now() - started} ms`);
            return {
                action,
                success: true,
                timestamp: Date.now()
            };
        }
        finally {
            this.snapshot.state =
                RecoveryState_1.RecoveryState.IDLE;
            LoggerService_1.LoggerService.error(`[RECOVERY] Failed ${action}`);
        }
    }
    async reloadPage() {
        const page = this.context
            .browser
            .getPage();
        LoggerService_1.LoggerService.warn("[RECOVERY] Reloading page");
        await page.reload({
            waitUntil: "domcontentloaded"
        });
        LoggerService_1.LoggerService.info("[RECOVERY] Page reloaded");
    }
    async captureSnapshot() {
        LoggerService_1.LoggerService.info("[RECOVERY] Capturing player snapshot");
        this.lastSnapshot =
            await this.context
                .player
                .getSnapshot();
        LoggerService_1.LoggerService.info("[RECOVERY] Snapshot captured");
    }
    getLastSnapshot() {
        LoggerService_1.LoggerService.info(`[RECOVERY] Snapshot:
            ${JSON.stringify(this.lastSnapshot)}`);
        return this.lastSnapshot;
    }
    async restoreVideo() {
        if (!this.lastSnapshot?.videoId) {
            LoggerService_1.LoggerService.warn("[RECOVERY] No video to restore.");
            return;
        }
        LoggerService_1.LoggerService.info(`[RECOVERY] Restoring video ${this.lastSnapshot.videoId}`);
        // await this.context.player.openVideo(
        //     this.lastSnapshot.videoId
        // );
        for (let i = 1; i <= 3; i++) {
            try {
                await this.context.player.openVideo(this.lastSnapshot.videoId);
                return;
            }
            catch (err) {
                LoggerService_1.LoggerService.warn(`[RECOVERY] Restore attempt ${i} failed`);
            }
        }
        throw new Error("Unable to restore video.");
        LoggerService_1.LoggerService.info("[RECOVERY] Video restored.");
    }
    async restorePosition() {
        if (!this.lastSnapshot) {
            return;
        }
        LoggerService_1.LoggerService.info(`[RECOVERY] Restoring position ${this.lastSnapshot.currentTime}`);
        if (this.lastSnapshot.currentTime < 1) {
            return;
        }
        await this.context.player.waitUntilReady();
        const snapshot = this.lastSnapshot;
        const targetTime = Math.min(snapshot.currentTime, Math.max(0, snapshot.duration - 1));
        // await this.context.player.seek(targetTime);
        for (let i = 1; i <= 3; i++) {
            try {
                await this.context.player.seek(targetTime);
                return;
            }
            catch {
            }
        }
    }
    async restoreSettings() {
        if (!this.lastSnapshot) {
            return;
        }
        LoggerService_1.LoggerService.info("[RECOVERY] Restoring player settings");
        if (this.lastSnapshot.volume >= 0 &&
            this.lastSnapshot.volume <= 100) {
            await this.context.player.setVolume(this.lastSnapshot.volume);
        }
        if (this.lastSnapshot.muted) {
            await this.context.player.mute();
        }
        else {
            await this.context.player.unmute();
        }
        const fullscreen = await this.context.player.isFullscreen();
        if (this.lastSnapshot.fullscreen &&
            !fullscreen) {
            await this.context.player.fullscreen();
        }
        LoggerService_1.LoggerService.info("[RECOVERY] Settings restored");
    }
    async restorePlayback() {
        if (!this.lastSnapshot) {
            return;
        }
        LoggerService_1.LoggerService.info("[RECOVERY] Restoring playback state");
        const snapshot = await this.context.player.getSnapshot();
        LoggerService_1.LoggerService.info(`[RECOVERY] Current time ${snapshot.currentTime}`);
        if (this.lastSnapshot.playing) {
            await this.context.player.play();
        }
        else {
            await this.context.player.pause();
        }
        LoggerService_1.LoggerService.info("[RECOVERY] Playback restored");
    }
}
exports.RecoveryEngine = RecoveryEngine;
