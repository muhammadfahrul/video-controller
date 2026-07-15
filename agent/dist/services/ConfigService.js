"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const config_1 = require("../config/config");
const ConfigValidator_1 = require("../config/ConfigValidator");
const network_1 = require("../utils/network");
class ConfigService {
    static instance;
    config;
    constructor() {
        this.config = config_1.config;
        ConfigValidator_1.ConfigValidator.validate(this.config);
    }
    static getInstance() {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }
    getConfig() {
        return this.config;
    }
    getServerUrl() {
        const ip = (0, network_1.getLocalIpAddress)();
        const port = process.env.PORT || 3000;
        return `http://${ip}:${port}`;
    }
}
exports.ConfigService = ConfigService;
