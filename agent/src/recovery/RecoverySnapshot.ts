import { RecoveryAction } from "./RecoveryAction";
import { RecoveryState } from "./RecoveryState";

export interface RecoverySnapshot {

    state: RecoveryState;

    lastAction: RecoveryAction;

    recoveryCount: number;

    lastRecoveryAt?: number;

}