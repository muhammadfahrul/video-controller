"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static info(message) {
        console.log("[INFO]", message);
    }
    static error(message) {
        console.log("[ERROR]", message);
    }
}
exports.Logger = Logger;
