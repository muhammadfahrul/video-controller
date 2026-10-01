import { HealthSnapshot } from "./HealthSnapshot";

export interface HealthCheck {

    check(): Promise<HealthSnapshot>;

}