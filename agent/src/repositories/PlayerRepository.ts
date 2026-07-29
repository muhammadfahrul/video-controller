import type { PlayerPersistence } from "../types/PlayerPersistence";

// NOTE: Data is now stored in server database, not local file
// This repository is kept for interface compatibility but no longer persists to disk

export class PlayerRepository {

    // In-memory storage only (server handles persistence)
    private data: PlayerPersistence = {
        player: {
            playing: false,
            currentTime: 0,
            duration: 0,
            volume: 100,
            muted: false,
            fullscreen: false,
            videoId: ""
        }
    };

    load() {
        return Promise.resolve(this.data);
    }

    save(
        data: PlayerPersistence
    ) {
        this.data = data;
        return Promise.resolve();
    }

    clear() {
        return this.save({
            player: {
                playing: false,
                currentTime: 0,
                duration: 0,
                volume: 100,
                muted: false,
                fullscreen: false,
                videoId: ""
            }
        });
    }
}
