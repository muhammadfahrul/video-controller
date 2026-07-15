"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonStorage = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class JsonStorage {
    file;
    defaultValue;
    constructor(file, defaultValue) {
        this.file = file;
        this.defaultValue = defaultValue;
    }
    async load() {
        try {
            const data = await fs_1.promises.readFile(this.file, "utf8");
            return JSON.parse(data);
        }
        catch {
            await this.save(this.defaultValue);
            return this.defaultValue;
        }
    }
    async save(data) {
        await fs_1.promises.mkdir(path_1.default.dirname(this.file), {
            recursive: true
        });
        await fs_1.promises.writeFile(this.file, JSON.stringify(data, null, 2));
    }
}
exports.JsonStorage = JsonStorage;
