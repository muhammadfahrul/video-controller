"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const express_1 = require("express");
const ServiceContainer_1 = require("../container/ServiceContainer");
const api_1 = require("../routes/api");
const SearchRoutes_1 = __importDefault(require("../routes/SearchRoutes"));
function registerRoutes(app, container) {
    app.use("/api", (0, api_1.createApiRouter)(container));
    app.get("/health", (_, res) => {
        res.json({
            status: "ok"
        });
    });
    app.use("/api/search", SearchRoutes_1.default);
}
//# sourceMappingURL=registerRoutes.js.map