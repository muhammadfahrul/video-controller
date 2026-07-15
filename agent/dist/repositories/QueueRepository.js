"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueRepository = void 0;
const path_1 = __importDefault(require("path"));
const JsonStorage_1 = require("../persistence/JsonStorage");
const RepeatMode_1 = require("../queue/RepeatMode");
class QueueRepository {
    storage = new JsonStorage_1.JsonStorage(path_1.default.join(process.cwd(), "data", "queue.json"), {
        items: [],
        currentIndex: -1,
        repeat: RepeatMode_1.RepeatMode.OFF,
        shuffle: false
    });
    load() {
        return this.storage.load();
    }
    save(data) {
        return this.storage.save(data);
    }
}
exports.QueueRepository = QueueRepository;
