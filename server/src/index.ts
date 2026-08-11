import dotenv from "dotenv";

dotenv.config();

import { createServer } from "http";
import { createApp } from "./app";
import { ServiceContainer } from "./container/ServiceContainer";
import { registerRoutes } from "./bootstrap/registerRoutes";

const PORT = process.env.PORT || 53331;
const BILLING_ENABLED = process.env.BILLING_ENABLED !== 'false';
const PRICE_PER_HOUR = process.env.PRICE_PER_HOUR ? Number(process.env.PRICE_PER_HOUR) : 50000;

const app = createApp();

const httpServer = createServer(app);

const container = new ServiceContainer(httpServer, BILLING_ENABLED, PRICE_PER_HOUR);

// Initialize database
container.initialize().then(() => {
    console.log("[SERVER] Initialization complete");
}).catch(err => {
    console.error("[SERVER] Initialization error:", err);
});

registerRoutes(app, container);

httpServer.listen(PORT, () => {

    console.log(`Server running on ${PORT}`);

});