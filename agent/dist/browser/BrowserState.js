"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserState = void 0;
var BrowserState;
(function (BrowserState) {
    BrowserState["STOPPED"] = "STOPPED";
    BrowserState["STARTING"] = "STARTING";
    BrowserState["RUNNING"] = "RUNNING";
    BrowserState["STOPPING"] = "STOPPING";
    BrowserState["ERROR"] = "ERROR";
})(BrowserState || (exports.BrowserState = BrowserState = {}));
