import dotenv from "dotenv";

dotenv.config();

import { createServer } from "http";
import { createApp } from "./app";
import { ServiceContainer } from "./container/ServiceContainer";
import { registerRoutes } from "./bootstrap/registerRoutes";

const PORT = 3000;

const app = createApp();

const httpServer = createServer(app);

const container = new ServiceContainer(httpServer);

registerRoutes(app, container);

httpServer.listen(PORT, () => {

    console.log(`Server running on ${PORT}`);

});