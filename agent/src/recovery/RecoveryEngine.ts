import { RecoveryAction } from "./RecoveryAction";
import { RecoverySnapshot } from "./RecoverySnapshot";
import { RecoveryState } from "./RecoveryState";
import { RecoveryResult } from "./RecoveryResult";
import { LoggerService } from "../services/LoggerService";
import { RecoveryContext } from "./RecoveryContext";
import { PlayerSnapshot } from "../types/PlayerSnapshot";

export class RecoveryEngine {

    private snapshot: RecoverySnapshot = {

        state: RecoveryState.IDLE,

        lastAction: RecoveryAction.NONE,

        recoveryCount: 0

    };

    private lastSnapshot?: PlayerSnapshot;

    private recovering = false;

    constructor(

        private readonly context: RecoveryContext

    ) {}

    public getSnapshot(): RecoverySnapshot {

        return {

            ...this.snapshot

        };

    }

    public isRecovering(): boolean {

        return this.snapshot.state === RecoveryState.RUNNING;

    }

    public async recover(

        action: RecoveryAction

    ): Promise<RecoveryResult> {

        const started =
            performance.now();

        LoggerService.info(

            `[RECOVERY] Start ${action}`

        );
        
        this.snapshot.state =

            RecoveryState.RUNNING;

        this.snapshot.lastAction =

            action;

        this.snapshot.recoveryCount++;

        this.snapshot.lastRecoveryAt =

            Date.now();

        if (this.recovering) {

            LoggerService.warn(
                "[RECOVERY] Already running"
            );

            return {
                action,
                success: false,
                timestamp: Date.now()
            };

        }

        this.recovering = true;

        try {

            await this.captureSnapshot();

            switch(action){

                        case RecoveryAction.RELOAD_PAGE:

                            await this.reloadPage();

                            await this.restoreVideo();

                            await this.restorePosition();

                            await this.restoreSettings();

                            await this.context.browser.getPage().waitForTimeout(300);

                            await this.restorePlayback();

                        default:

                            LoggerService.warn(

                                "Unknown recovery"

                            );

                            break;

                    }

            LoggerService.info(

                `[RECOVERY] Finished ${action}`

            );

            LoggerService.info(

                `[RECOVERY] Finished in ${
                    performance.now()-started
                } ms`

            );

            return {

                action,

                success: true,

                timestamp: Date.now()

            };
        }

        finally {

            this.snapshot.state =

                RecoveryState.IDLE;

            LoggerService.error(

                `[RECOVERY] Failed ${action}`

            );

        }

    }

    private async reloadPage() {

        const page =

            this.context
                .browser
                .getPage();

        LoggerService.warn(

            "[RECOVERY] Reloading page"

        );

        await page.reload({

            waitUntil:"domcontentloaded"

        });

        LoggerService.info(

            "[RECOVERY] Page reloaded"

        );

    }

    private async captureSnapshot(): Promise<void> {

        LoggerService.info(
            "[RECOVERY] Capturing player snapshot"
        );

        this.lastSnapshot =
            await this.context
                .player
                .getSnapshot();

        LoggerService.info(
            "[RECOVERY] Snapshot captured"
        );

    }

    public getLastSnapshot() {

        LoggerService.info(

            `[RECOVERY] Snapshot:
            ${JSON.stringify(this.lastSnapshot)}`
        );

        return this.lastSnapshot;

    }

    private async restoreVideo(): Promise<void> {

        if (!this.lastSnapshot?.videoId) {

            LoggerService.warn(
                "[RECOVERY] No video to restore."
            );

            return;

        }

        LoggerService.info(

            `[RECOVERY] Restoring video ${this.lastSnapshot.videoId}`

        );

        // await this.context.player.openVideo(

        //     this.lastSnapshot.videoId

        // );

        for(let i=1;i<=3;i++){

            try{

                await this.context.player.openVideo(
                    this.lastSnapshot.videoId
                );

                return;

            }
            catch(err){

                LoggerService.warn(

                    `[RECOVERY] Restore attempt ${i} failed`

                );

            }

        }

        throw new Error(
            "Unable to restore video."
        );

        LoggerService.info(

            "[RECOVERY] Video restored."

        );

    }

    private async restorePosition(): Promise<void> {

        if (!this.lastSnapshot) {

            return;

        }

        LoggerService.info(

            `[RECOVERY] Restoring position ${this.lastSnapshot.currentTime}`

        );

        if (

            this.lastSnapshot.currentTime < 1

        ){

            return;

        }

        await this.context.player.waitUntilReady();

        const snapshot = this.lastSnapshot!;

        const targetTime = Math.min(
            snapshot.currentTime,
            Math.max(0, snapshot.duration - 1)
        );

        // await this.context.player.seek(targetTime);

        for(let i=1;i<=3;i++){

            try{

                await this.context.player.seek(
                    targetTime
                );

                return;

            }
            catch{

            }

        }

    }

    private async restoreSettings(): Promise<void> {

        if (!this.lastSnapshot) {

            return;

        }

        LoggerService.info(
            "[RECOVERY] Restoring player settings"
        );

        if (

            this.lastSnapshot.volume >= 0 &&

            this.lastSnapshot.volume <= 100

        ){

            await this.context.player.setVolume(

                this.lastSnapshot.volume

            );

        }

        if (this.lastSnapshot.muted) {

            await this.context.player.mute();

        }
        else {

            await this.context.player.unmute();

        }

        const fullscreen =

            await this.context.player.isFullscreen();

        if (

            this.lastSnapshot.fullscreen &&

            !fullscreen

        ){

            await this.context.player.fullscreen();

        }

        LoggerService.info(
            "[RECOVERY] Settings restored"
        );

    }

    private async restorePlayback(): Promise<void> {

        if (!this.lastSnapshot) {

            return;

        }

        LoggerService.info(
            "[RECOVERY] Restoring playback state"
        );

        const snapshot =
            await this.context.player.getSnapshot();

        LoggerService.info(

            `[RECOVERY] Current time ${snapshot.currentTime}`

        );

        if (this.lastSnapshot.playing) {

            await this.context.player.play();

        }
        else {

            await this.context.player.pause();

        }

        LoggerService.info(
            "[RECOVERY] Playback restored"
        );

    }
}