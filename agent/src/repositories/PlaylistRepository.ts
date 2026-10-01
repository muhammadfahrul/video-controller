import { PlaylistPersistence } from "../types/PlaylistPersistence";

import { RepeatMode } from "../playlist/RepeatMode";

// NOTE: Data is now stored in server database, not local file
// This repository is kept for interface compatibility but no longer persists to disk

export class PlaylistRepository {

    // In-memory storage only (server handles persistence)
    private data: PlaylistPersistence = {
        items: [],
        currentIndex: -1,
        repeat: RepeatMode.OFF,
        shuffle: false
    };

    load() {
        return Promise.resolve(this.data);
    }

    save(
        data: PlaylistPersistence
    ) {
        this.data = data;
        return Promise.resolve();
    }

    clear() {
        return this.save({
            items: [],
            currentIndex: -1,
            repeat: RepeatMode.OFF,
            shuffle: false
        });
    }

}