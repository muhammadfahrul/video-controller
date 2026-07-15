"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEvents = void 0;
var PlayerEvents;
(function (PlayerEvents) {
    PlayerEvents["READY"] = "player.ready";
    PlayerEvents["PLAY"] = "player.play";
    PlayerEvents["PAUSE"] = "player.pause";
    PlayerEvents["END"] = "player.end";
    PlayerEvents["TIME_UPDATE"] = "player.time_update";
    PlayerEvents["ERROR"] = "player.error";
    PlayerEvents["VOLUME"] = "player.volume";
})(PlayerEvents || (exports.PlayerEvents = PlayerEvents = {}));
