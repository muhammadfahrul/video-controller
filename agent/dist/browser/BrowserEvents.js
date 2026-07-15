"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserEvents = void 0;
var BrowserEvents;
(function (BrowserEvents) {
    BrowserEvents["STARTING"] = "browser.starting";
    BrowserEvents["STARTED"] = "browser.started";
    BrowserEvents["STOPPING"] = "browser.stopping";
    BrowserEvents["STOPPED"] = "browser.stopped";
    BrowserEvents["DISCONNECTED"] = "browser.disconnected";
    BrowserEvents["ERROR"] = "browser.error";
})(BrowserEvents || (exports.BrowserEvents = BrowserEvents = {}));
