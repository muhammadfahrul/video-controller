"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Agent_1 = require("./core/Agent");
async function bootstrap() {
    const agent = new Agent_1.Agent();
    await agent.start();
}
bootstrap();
