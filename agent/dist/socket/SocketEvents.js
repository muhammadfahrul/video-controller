"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvents = void 0;
var SocketEvents;
(function (SocketEvents) {
    SocketEvents["AGENT_REGISTER"] = "agent:register";
    SocketEvents["AGENT_HEARTBEAT"] = "agent:heartbeat";
    SocketEvents["COMMAND"] = "command";
    SocketEvents["AGENT_STATUS"] = "agent:status";
    SocketEvents["PLAYER_COMMAND"] = "player:command";
    SocketEvents["PLAYER_STATE"] = "player:state";
    SocketEvents["PLAYER_UPDATE"] = "player:update";
    SocketEvents["QUEUE_STATE"] = "queue:state";
    SocketEvents["QUEUE_UPDATE"] = "queue:update";
})(SocketEvents || (exports.SocketEvents = SocketEvents = {}));
