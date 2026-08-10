import { Express } from "express";

import { ServiceContainer } from "../container/ServiceContainer";

import { createApiRouter } from "../routes/api";

import { createHealthRouter } from "../routes/health";

import searchRoutes from "../routes/SearchRoutes";

export function registerRoutes(
    app: Express,
    container: ServiceContainer
) {

    app.use(
        "/api",
        createApiRouter(container)
    );

    app.use(
        "/api",
        createHealthRouter(container)
    );

    app.use(
        "/api/search",
        searchRoutes
    )

}