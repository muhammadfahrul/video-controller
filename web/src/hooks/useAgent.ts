import { useEffect } from "react";

import { agentService } from "../services";
import { socketService } from "../services";
import { appStateService } from "../services/AppStateService";

export function useAgent() {

    useEffect(() => {

        console.log(
            "useAgent mounted"
        );

        async function load() {

            try {

                const agents = await agentService.list();

                if (agents.length === 0) {

                    return;

                }

                const agent = agents[0];

                appStateService.setAgent({

                    id: agent.id,

                    name: agent.name,

                    // Agent is online if status is ONLINE/PLAYING AND isActive is true
                    online: (agent.status === "ONLINE" || agent.status === "PLAYING") && agent.isActive === true,

                    lastHeartbeat: agent.lastHeartbeat,

                    isActive: agent.isActive === true,

                    expiresAt: agent.expiresAt ?? null

                });

            }

            catch (err) {

                console.error(err);

            }

        }

        load();

        socketService.connect();

        const unsubscribe = socketService.on<any[]>(

            "agents:update",

            (agents) => {

                if (agents.length === 0) {
                    
                    appStateService.setAgent({

                        id: "",

                        name: "",

                        online: false,

                        lastHeartbeat: 0,

                        isActive: false,

                        expiresAt: null

                    });

                    return;

                }

                const agent = agents[0];

                appStateService.setAgent({

                    id: agent.id,

                    name: agent.name,

                    // Agent is online if status is ONLINE/PLAYING AND isActive is true
                    online: (agent.status === "ONLINE" || agent.status === "PLAYING") && agent.isActive === true,

                    lastHeartbeat: agent.lastHeartbeat,

                    isActive: agent.isActive === true,

                    expiresAt: agent.expiresAt ?? null

                });

            }

        );

        return () => {

            console.log(
                "useAgent unmounted"
            );

            unsubscribe();

        };

    }, []);

}