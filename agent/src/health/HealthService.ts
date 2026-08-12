import { BrowserManager } from "../browser/BrowserManager";
import { LoggerService } from "../services/LoggerService";
import { BrowserHealthCheck } from "./BrowserHealthCheck";
import { HealthScheduler } from "./HealthScheduler";
import { HealthSnapshot } from "./HealthSnapshot";
import { HealthStatus } from "./HealthStatus";
import { PageHealthCheck } from "./PageHealthCheck";
import { VideoHealthCheck } from "./VideoHealthCheck";
import { PlayerService } from "../services/PlayerService";
import { PlayerHealthCheck } from "./PlayerHealthCheck";
import { RecoveryEngine } from "../recovery/RecoveryEngine";
import { RecoveryAction } from "../recovery/RecoveryAction";

export class HealthService {

    private readonly scheduler =
        new HealthScheduler();

    private readonly recovery: RecoveryEngine;

    private readonly browserCheck:
        BrowserHealthCheck;

    private readonly pageCheck:
        PageHealthCheck;

    private readonly videoCheck:
        VideoHealthCheck;

    private readonly playerCheck:
        PlayerHealthCheck;

    private previousStatus =
        HealthStatus.HEALTHY;

    private snapshot: HealthSnapshot = {

        status: HealthStatus.HEALTHY,

        browser: true,

        page: true,

        video: true,

        player: true,

        timestamp: Date.now()

    };

    private totalChecks = 0;

    private totalFailures = 0;

    private consecutiveFailures = 0;

    private lastHealthyAt = Date.now();

    constructor(

        private readonly browser:

            BrowserManager,

        private readonly player:

            PlayerService,

        private readonly onEvent?: (event: {
            type: string;
            message: string;
            context?: Record<string, unknown>;
        }) => void

    ) {

        this.browserCheck =

            new BrowserHealthCheck(

                browser

            );

        this.pageCheck =
            new PageHealthCheck(
                browser
            );

        this.videoCheck =
            new VideoHealthCheck(
                player
            );

        this.playerCheck =
            new PlayerHealthCheck(
                player
            );

        this.recovery =
            new RecoveryEngine({
                browser,
                player
            });

    }

    public start(
        interval: number
    ) {

        this.scheduler.start(

            interval,

            async () => {

                await this.check();

            }

        );

    }

    public stop() {

        this.scheduler.stop();

    }

    public async check() {

        this.totalChecks++;

        const browserHealthy =

            await this.browserCheck.check();

        if (!browserHealthy) {

            LoggerService.error(

                "[HEALTH] Browser unhealthy"

            );

        }

        const pageHealthy =
            await this.pageCheck.check();

        if (!pageHealthy) {

            LoggerService.error(

                "[HEALTH] Page unhealthy"

            );

        }

        const videoHealthy =
            await this.videoCheck.check();

        if (!videoHealthy) {
            LoggerService.error(

                "[HEALTH] Video element missing"

            );
        }

        const playerHealthy =
            await this.playerCheck.check();

        if (!playerHealthy) {

            LoggerService.error(

                "[HEALTH] Player unhealthy"

            );

        }

        const healthy =

            browserHealthy &&
            pageHealthy &&
            videoHealthy &&
            playerHealthy;

        if (healthy) {

            this.consecutiveFailures = 0;

            this.lastHealthyAt = Date.now();

        } else {

            this.totalFailures++;

            this.consecutiveFailures++;

            LoggerService.warn(

                `[HEALTH] Consecutive failures: ${this.consecutiveFailures}`

            );

            if (

                this.shouldRecover() &&
                !this.recovery.isRecovering()

            ) {

                if (!browserHealthy) {

                    LoggerService.error(

                        "[HEALTH] Browser unrecoverable in-process, exiting so the process manager can relaunch it."

                    );

                    this.onEvent?.({
                        type: "HEALTH_BROWSER_UNRECOVERABLE",
                        message: "Browser reported unhealthy; agent process is exiting so the process manager can relaunch it",
                        context: { ...this.snapshot }
                    });

                    process.exit(1);

                } else {

                    const failuresBeforeRecovery = this.consecutiveFailures;

                    this.recovery.recover(
                        RecoveryAction.RELOAD_PAGE
                    ).then((result) => {

                        this.onEvent?.({
                            type: "HEALTH_RECOVERY_ATTEMPT",
                            message: `Recovery action ${result.action} ${result.success ? "succeeded" : "failed"}`,
                            context: { ...result, consecutiveFailuresBeforeRecovery: failuresBeforeRecovery }
                        });

                    }).catch((error) => {

                        LoggerService.error(
                            `[HEALTH] Recovery attempt failed: ${error}`
                        );

                        this.onEvent?.({
                            type: "HEALTH_RECOVERY_ATTEMPT",
                            message: `Recovery action threw: ${error instanceof Error ? error.message : String(error)}`,
                            context: { consecutiveFailuresBeforeRecovery: failuresBeforeRecovery }
                        });

                    });

                }

                this.consecutiveFailures = 0;

            }

        }

        this.snapshot = {

            status:

                browserHealthy && pageHealthy && videoHealthy && playerHealthy

                    ?

                    HealthStatus.HEALTHY

                    :

                    HealthStatus.ERROR,

            browser:

                browserHealthy,

            page:

                pageHealthy,

            video: videoHealthy,

            player: playerHealthy,

            timestamp:
                Date.now()

        };

        console.log(

            "[HEALTH]",

            this.snapshot

        );

        if (

            this.snapshot.status !==
            this.previousStatus

        ) {

            LoggerService.warn(

                `[HEALTH] ${this.previousStatus} -> ${this.snapshot.status}`

            );

            this.previousStatus =
                this.snapshot.status;

        }

    }

    public getSnapshot() {

        return this.snapshot;

    }

    public getMetrics() {

        return {

            totalChecks:

                this.totalChecks,

            totalFailures:

                this.totalFailures,

            consecutiveFailures:

                this.consecutiveFailures,

            lastHealthyAt:

                this.lastHealthyAt

        };

    }

    public shouldRecover(): boolean {

        return this.consecutiveFailures >= 3;

    }

}