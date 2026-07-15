"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeekHandler = void 0;
class SeekHandler {
    player;
    constructor(player) {
        this.player = player;
    }
    async execute(command) {
        if (command.seek === undefined) {
            throw new Error("seek is required");
        }
        console.log("SeekHandler.execute", command);
        await this.player.seek(command.seek);
    }
}
exports.SeekHandler = SeekHandler;
