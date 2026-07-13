import { RepeatMode } from "../queue/RepeatMode";
import { QueueRepository } from "../repositories/QueueRepository";
import { QueuePersistence } from "../types/QueuePersistence";
import { QueueSnapshot } from "../types/QueueSnapshot";

export class QueueService {

    constructor(

        private readonly repository: QueueRepository

    ) {}
    
    private items: QueueItem[] = [];

    private currentIndex = -1;

    private repeatMode = RepeatMode.OFF;

    private shuffleEnabled = false;

    public async add(
        item: QueueItem
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

        // Sudah melewati item pertama
        if (
            this.currentIndex < 0
        ) {

            if (
                this.repeatMode ===
                RepeatMode.ALL
            ) {

                // Lompat ke item terakhir
                this.currentIndex =
                    this.items.length - 1;

            } else {

                // Tetap di item pertama
                this.currentIndex = 0;

                return undefined;

            }

        }

        await this.persist();

        return this.items[
            this.currentIndex
        ];

    }

    public size() {

        return this.items.length;

    }

    public getAll() {

        return [...this.items];

    }

    public async remove(id: string): boolean {

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

        await this.persist();

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

        const shuffled =
            [...this.items];

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

        this.items =
            shuffled;

        this.currentIndex =
            this.items.findIndex(
                item =>
                    item.id === current.id
            );

        await this.persist();

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

    public getSnapshot(): QueueSnapshot {

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
        snapshot: QueuePersistence
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

            "[QUEUE] Loaded",

            snapshot.items.length,

            "items"

        );

    }
}