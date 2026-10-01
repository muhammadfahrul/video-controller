import pino from "pino";
import { ConfigService } from "./ConfigService";

const config = ConfigService.getInstance().getConfig();

export class LoggerService {

    private static readonly logger = pino({
        level: config.logging.level,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard"
            }
        }
    });

    public static info(message: string): void {
        LoggerService.logger.info(message);
    }

    public static warn(message: string): void {
        LoggerService.logger.warn(message);
    }

    public static error(message: string): void {
        LoggerService.logger.error(message);
    }

    public static debug(message: string): void {
        LoggerService.logger.debug(message);
    }

}