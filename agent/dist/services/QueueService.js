"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const RepeatMode_1 = require("../queue/RepeatMode");
class QueueService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    items = [];
    currentIndex = -1;
    repeatMode = RepeatMode_1.RepeatMode.OFF;
    shuffleEnabled = false;
    async add(item) {
        this.items.push(item);
        if (this.currentIndex === -1) {
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
    async next() {
        if (this.items.length === 0) {
            return undefined;
        }
        if (this.repeatMode ===
            RepeatMode_1.RepeatMode.ONE) {
            return this.items[this.currentIndex];
        }
        this.currentIndex++;
        if (this.currentIndex >=
            this.items.length) {
            if (this.repeatMode ===
                RepeatMode_1.RepeatMode.ALL) {
                this.currentIndex = 0;
            }
            else {
                this.currentIndex =
                    this.items.length - 1;
                return undefined;
            }
        }
        await this.persist();
        return this.items[this.currentIndex];
    }
    async previous() {
        if (this.items.length === 0) {
            return undefined;
        }
        // REPEAT_ONE
        if (this.repeatMode ===
            RepeatMode_1.RepeatMode.ONE) {
            return this.items[this.currentIndex];
        }
        this.currentIndex--;
        // Sudah melewati item pertama
        if (this.currentIndex < 0) {
            if (this.repeatMode ===
                RepeatMode_1.RepeatMode.ALL) {
                // Lompat ke item terakhir
                this.currentIndex =
                    this.items.length - 1;
            }
            else {
                // Tetap di item pertama
                this.currentIndex = 0;
                return undefined;
            }
        }
        await this.persist();
        return this.items[this.currentIndex];
    }
    size() {
        return this.items.length;
    }
    getAll() {
        return [...this.items];
    }
    async remove(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }
        this.items.splice(index, 1);
        if (this.currentIndex > index) {
            this.currentIndex--;
        }
        else if (this.currentIndex >= this.items.length) {
            this.currentIndex = this.items.length - 1;
        }
        if (this.items.length === 0) {
            this.currentIndex = -1;
        }
        await this.persist();
        return true;
    }
    async clear() {
        this.items = [];
        this.currentIndex = -1;
        await this.persist();
    }
    async playById(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return undefined;
        }
        this.currentIndex =
            index;
        await this.persist();
        return this.items[index];
    }
    async shuffle() {
        if (this.items.length <= 1) {
            return;
        }
        this.shuffleEnabled = true;
        const current = this.items[this.currentIndex];
        const shuffled = [...this.items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
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
            this.items.findIndex(item => item.id === current.id);
        await this.persist();
    }
    async setRepeatMode(mode) {
        this.repeatMode = mode;
        await this.persist();
    }
    getRepeatMode() {
        return this.repeatMode;
    }
    getCurrentIndex() {
        return this.currentIndex;
    }
    isShuffleEnabled() {
        return this.shuffleEnabled;
    }
    getSnapshot() {
        return {
            items: this.getAll(),
            currentIndex: this.getCurrentIndex(),
            repeat: this.getRepeatMode(),
            shuffle: this.isShuffleEnabled()
        };
    }
    async persist() {
        await this.repository.save({
            items: this.items,
            currentIndex: this.currentIndex,
            repeat: this.repeatMode,
            shuffle: this.isShuffleEnabled()
        });
    }
    restore(snapshot) {
        this.items = [...snapshot.items];
        if (snapshot.currentIndex >= 0 &&
            snapshot.currentIndex < snapshot.items.length) {
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
    async load() {
        const snapshot = await this.repository.load();
        this.restore(snapshot);
        console.log("[QUEUE] Loaded", snapshot.items.length, "items");
    }
}
exports.QueueService = QueueService;
