"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerState = void 0;
var PlayerState;
(function (PlayerState) {
    PlayerState["IDLE"] = "IDLE";
    PlayerState["LOADING"] = "LOADING";
    PlayerState["READY"] = "READY";
    PlayerState["PLAYING"] = "PLAYING";
    PlayerState["PAUSED"] = "PAUSED";
    PlayerState["ENDED"] = "ENDED";
    PlayerState["ERROR"] = "ERROR";
})(PlayerState || (exports.PlayerState = PlayerState = {}));
