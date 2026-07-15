"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEvent = void 0;
var PlayerEvent;
(function (PlayerEvent) {
    PlayerEvent["READY"] = "ready";
    PlayerEvent["PLAY"] = "play";
    PlayerEvent["PAUSE"] = "pause";
    PlayerEvent["ENDED"] = "ended";
    PlayerEvent["STATUS"] = "status";
    PlayerEvent["ERROR"] = "error";
})(PlayerEvent || (exports.PlayerEvent = PlayerEvent = {}));
