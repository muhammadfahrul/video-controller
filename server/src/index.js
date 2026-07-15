"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = require("http");
const app_1 = require("./app");
const ServiceContainer_1 = require("./container/ServiceContainer");
const registerRoutes_1 = require("./bootstrap/registerRoutes");
const PORT = process.env.PORT || 3000;
const app = (0, app_1.createApp)();
const httpServer = (0, http_1.createServer)(app);
const container = new ServiceContainer_1.ServiceContainer(httpServer);
(0, registerRoutes_1.registerRoutes)(app, container);
httpServer.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
//# sourceMappingURL=index.js.map