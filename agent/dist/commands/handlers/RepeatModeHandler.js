"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepeatModeHandler = void 0;
class RepeatModeHandler {
    playlist;
    mode;
    constructor(playlist, mode) {
        this.playlist = playlist;
        this.mode = mode;
    }
    async execute(command) {
        await this.playlist.setRepeatMode(this.mode);
        console.log("Repeat:", this.mode);
    }
}
exports.RepeatModeHandler = RepeatModeHandler;
