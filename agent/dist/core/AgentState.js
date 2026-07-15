"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentState = void 0;
var AgentState;
(function (AgentState) {
    AgentState["CREATED"] = "CREATED";
    AgentState["STARTING"] = "STARTING";
    AgentState["RUNNING"] = "RUNNING";
    AgentState["STOPPING"] = "STOPPING";
    AgentState["STOPPED"] = "STOPPED";
    AgentState["ERROR"] = "ERROR";
})(AgentState || (exports.AgentState = AgentState = {}));
