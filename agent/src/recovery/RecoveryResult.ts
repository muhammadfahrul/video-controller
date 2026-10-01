import { RecoveryAction } from "./RecoveryAction";

export interface RecoveryResult {

    action: RecoveryAction;

    success: boolean;

    timestamp: number;

    message?: string;

}