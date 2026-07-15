"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIdentityProvider = void 0;
class AgentIdentityProvider {
    identity;
    constructor() {
        this.identity = {
            id: "windows-agent-01",
            name: "Windows Player"
        };
    }
    get() {
        return this.identity;
    }
}
exports.AgentIdentityProvider = AgentIdentityProvider;
