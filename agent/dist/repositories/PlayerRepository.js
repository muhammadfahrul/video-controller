"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerRepository = void 0;
const path_1 = __importDefault(require("path"));
const JsonStorage_1 = require("../persistence/JsonStorage");
class PlayerRepository {
    storage = new JsonStorage_1.JsonStorage(path_1.default.join(process.cwd(), "data", "player.json"), {
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
    load() {
        return this.storage.load();
    }
    save(data) {
        return this.storage.save(data);
    }
}
exports.PlayerRepository = PlayerRepository;
