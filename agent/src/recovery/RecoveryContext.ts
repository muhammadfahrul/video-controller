import { BrowserManager } from "../browser/BrowserManager";
import { PlayerService } from "../services/PlayerService";

export interface RecoveryContext {

    browser: BrowserManager;

    player: PlayerService;

}