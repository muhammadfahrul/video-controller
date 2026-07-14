import { HealthStatus } from "./HealthStatus";

export interface HealthSnapshot {

    status: HealthStatus;

    browser: boolean;

    page: boolean;

    video: boolean;

    player: boolean;

    timestamp: number;

}