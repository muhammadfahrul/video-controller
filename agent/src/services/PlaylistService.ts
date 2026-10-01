import { RepeatMode } from "../playlist/RepeatMode";
import { PlaylistItem } from "../playlist/PlaylistItem";
import { PlaylistRepository } from "../repositories/PlaylistRepository";
import { PlaylistPersistence } from "../types/PlaylistPersistence";
import { PlaylistSnapshot } from "../types/PlaylistSnapshot";

export class PlaylistService {

    constructor(

        private readonly repository: PlaylistRepository

    ) {}

    getRepository(): PlaylistRepository {
        return this.repository;
    }
    
    private items: PlaylistItem[] = [];

    private currentIndex = -1;

    private repeatMode = RepeatMode.OFF;

    private shuffleEnabled = false;

    public async add(
        item: PlaylistItem
    ) {

        this.items.push(
            item
        );

        if (
            this.currentIndex === -1
        ) {

            this.currentIndex = 0;

        }

        await this.persist();

    }

    current() {

        if (this.currentIndex < 0) {

            return undefined;

        }

        return this.items[this.currentIndex];

    }

    public async next() {

        if (
            this.items.length === 0
        ) {

            return undefined;

        }

        if (
            this.repeatMode ===
            RepeatMode.ONE
        ) {

            return this.items[
                this.currentIndex
            ];

        }

        this.currentIndex++;

        if (
            this.currentIndex >=
            this.items.length
        ) {

            if (
                this.repeatMode ===
                RepeatMode.ALL
            ) {

                this.currentIndex = 0;

            } else {

                this.currentIndex =
                    this.items.length - 1;

                return undefined;

            }

        }

        await this.persist();

        return this.items[
            this.currentIndex
        ];

    }

    public async previous() {

        if (
            this.items.length === 0
        ) {

            return undefined;

        }

        // REPEAT_ONE
        if (
            this.repeatMode ===
            RepeatMode.ONE
        ) {

            return this.items[
                this.currentIndex
            ];

        }

        this.currentIndex--;

        // Already past first item
        if (
            this.currentIndex < 0
        ) {

            if (
                this.repeatMode ===
                RepeatMode.ALL
            ) {

                // Jump to last item
                this.currentIndex =
                    this.items.length - 1;

            } else {

                // Stay at first item
                this.currentIndex = 0;

                return undefined;

            }

        }

        await this.persist();

        return this.items[
            this.currentIndex
        ];

    }

    /**
     * Plays a video outside the normal next/previous flow (e.g. the search
     * page's "Play" button) while keeping the playlist in sync: reuses the
     * existing entry and jumps to it if this videoId is already in the
     * playlist, otherwise inserts `item` right after the currently playing
     * one and makes it current. Inserting there (rather than appending to
     * the end) means the rest of the queue is just "interrupted", not
     * skipped - once this video ends, next() naturally continues with
     * whatever was queued after the item that was playing before.
     */
    public async playOrAdd(
        item: PlaylistItem
    ): Promise<PlaylistItem> {

        const existingIndex =
            this.items.findIndex(
                existing => existing.videoId === item.videoId
            );

        if (existingIndex !== -1) {

            this.currentIndex = existingIndex;

            // Merge in whatever metadata this call carries (e.g. a "Play"
            // click has title/thumbnail/channel/duration) onto the
            // existing entry, which may have been created without it -
            // otherwise a stale metadata-less entry stays empty forever.
            const existing = this.items[existingIndex];

            this.items[existingIndex] = {
                ...existing,
                title: item.title ?? existing.title,
                channel: item.channel ?? existing.channel,
                thumbnail: item.thumbnail ?? existing.thumbnail,
                duration: item.duration ?? existing.duration
            };

            await this.persist();

            return this.items[existingIndex];

        }

        const insertIndex =
            this.currentIndex + 1;

        this.items.splice(
            insertIndex,
            0,
            item
        );

        this.currentIndex = insertIndex;

        await this.persist();

        return item;

    }

    public size() {

        return this.items.length;

    }

    public getAll() {

        return [...this.items];

    }

    public async remove(id: string): Promise<boolean> {

        const index = this.items.findIndex(
            item => item.id === id
        );

        if (index === -1) {
            return false;
        }

        this.items.splice(index, 1);

        if (this.currentIndex > index) {
            this.currentIndex--;
        } else if (this.currentIndex >= this.items.length) {
            this.currentIndex = this.items.length - 1;
        }

        if (this.items.length === 0) {
            this.currentIndex = -1;
        }

        await this.persist();

        return true;
    }

    public async clear() {

        this.items = [];

        this.currentIndex = -1;
        
        this.repeatMode = RepeatMode.OFF;
        
        this.shuffleEnabled = false;

        await this.persist();

    }

    // Restore playlist state from server database
    public async restoreState(playlistState: {
        items?: PlaylistItem[];
        currentIndex?: number;
        repeat?: string;
        shuffle?: boolean;
    }): Promise<void> {
        console.log("[PlaylistService] Restoring playlist state from server:", playlistState);
        
        if (!playlistState) {
            console.log("[PlaylistService] No valid playlist state to restore");
            return;
        }

        try {
            // Restore playlist items
            if (playlistState.items && playlistState.items.length > 0) {
                this.items = playlistState.items.map(item => ({
                    id: item.id || item.videoId,
                    videoId: item.videoId,
                    title: item.title,
                    thumbnail: item.thumbnail,
                    channel: item.channel,
                    duration: item.duration,
                    addedAt: item.addedAt || Date.now()
                }));
            }
            
            // Restore current index
            this.currentIndex = playlistState.currentIndex ?? -1;
            
            // Restore repeat mode
            if (playlistState.repeat) {
                this.repeatMode = playlistState.repeat.toUpperCase() as any;
            }
            
            // Restore shuffle
            this.shuffleEnabled = playlistState.shuffle ?? false;
            
            await this.persist();
            
            console.log("[PlaylistService] Playlist state restored successfully");
        } catch (error) {
            console.error("[PlaylistService] Error restoring playlist state:", error);
        }
    }

    public async playById(
        id: string
    ) {

        const index =
            this.items.findIndex(
                item => item.id === id
            );

        if (
            index === -1
        ) {

            return undefined;

        }

        this.currentIndex =
            index;

        await this.persist();

        return this.items[
            index
        ];

    }

    public async shuffle() {

        if (this.items.length <= 1) {
            return;
        }

        this.shuffleEnabled = true

        const current =
            this.items[this.currentIndex];

        let shuffled: PlaylistItem[];
        let attempts = 0;
        
        // Retry shuffle until order is different from original
        do {
            shuffled = [...this.items];
            
            for (
                let i = shuffled.length - 1;
                i > 0;
                i--
            ) {

                const j =
                    Math.floor(
                        Math.random() * (i + 1)
                    );

                [
                    shuffled[i],
                    shuffled[j]
                ] = [
                    shuffled[j],
                    shuffled[i]
                ];

            }
            
            attempts++;
            
        } while (
            this.isSameOrder(this.items, shuffled) && 
            attempts < 10
        );

        this.items =
            shuffled;

        this.currentIndex =
            this.items.findIndex(
                item =>
                    item.id === current.id
            );

        await this.persist();

    }
    
    public async move(
        id: string,
        direction: "up" | "down"
    ): Promise<boolean> {

        const index = this.items.findIndex(
            item => item.id === id
        );

        if (index === -1) {
            return false;
        }

        const targetIndex =
            direction === "up"
                ? index - 1
                : index + 1;

        if (
            targetIndex < 0 ||
            targetIndex >= this.items.length
        ) {
            return false;
        }

        const currentId =
            this.currentIndex >= 0
                ? this.items[this.currentIndex]?.id
                : undefined;

        [
            this.items[index],
            this.items[targetIndex]
        ] = [
            this.items[targetIndex],
            this.items[index]
        ];

        if (currentId) {
            this.currentIndex = this.items.findIndex(
                item => item.id === currentId
            );
        }

        await this.persist();

        return true;

    }

    private isSameOrder(
        original: PlaylistItem[],
        shuffled: PlaylistItem[]
    ): boolean {
        
        if (original.length !== shuffled.length) {
            return false;
        }
        
        for (let i = 0; i < original.length; i++) {
            if (original[i].id !== shuffled[i].id) {
                return false;
            }
        }
        
        return true;
        
    }

    public async setRepeatMode(
        mode: RepeatMode
    ) {

        this.repeatMode = mode;

        await this.persist();

    }

    public getRepeatMode() {

        return this.repeatMode;

    }

    public getCurrentIndex() {

        return this.currentIndex;

    }

    public isShuffleEnabled() {

        return this.shuffleEnabled;

    }

    public getSnapshot(): PlaylistSnapshot {

        return {

            items: this.getAll(),

            currentIndex: this.getCurrentIndex(),

            repeat: this.getRepeatMode(),

            shuffle: this.isShuffleEnabled()

        };

    }

    private async persist() {

        await this.repository.save({

            items: this.items,

            currentIndex: this.currentIndex,

            repeat: this.repeatMode,

            shuffle: this.isShuffleEnabled()

        });

    }

    public restore(
        snapshot: PlaylistPersistence
    ) {

        this.items = [...snapshot.items];

        if (

            snapshot.currentIndex >= 0 &&

            snapshot.currentIndex < snapshot.items.length

        ) {

            this.currentIndex =
                snapshot.currentIndex;

        }
        else {

            this.currentIndex =
                snapshot.items.length > 0
                    ? 0
                    : -1;

        }

        this.repeatMode =
            snapshot.repeat;

        this.shuffleEnabled =
            snapshot.shuffle;

    }

    public async load() {

        const snapshot =
            await this.repository.load();

        this.restore(snapshot);

        console.log(

            "[PLAYLIST] Loaded",

            snapshot.items.length,

            "items"

        );

    }
}