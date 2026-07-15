"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const pino_1 = __importDefault(require("pino"));
const ConfigService_1 = require("./ConfigService");
const config = ConfigService_1.ConfigService.getInstance().getConfig();
class LoggerService {
    static logger = (0, pino_1.default)({
        level: config.logging.level,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard"
            }
        }
    });
    static info(message) {
        LoggerService.logger.info(message);
    }
    static warn(message) {
        LoggerService.logger.warn(message);
    }
    static error(message) {
        LoggerService.logger.error(message);
    }
    static debug(message) {
        LoggerService.logger.debug(message);
    }
}
exports.LoggerService = LoggerService;
