import { Express } from "express";

import { ServiceContainer } from "../container/ServiceContainer";

import { createApiRouter } from "../routes/api";

export function registerRoutes(
    app: Express,
    container: ServiceContainer
) {

    app.use(
        "/api",
        createApiRouter(container)
    );

    app.get(
        "/health",
        (_, res) => {

            res.json({
                status: "ok"
            });

        }
    );

}