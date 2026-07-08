import { useEffect } from "react";

import { agentService } from "../services";
import { socketService } from "../services";
import { useAppStore } from "../store/appStore";

export function useAgent() {

    const {

        loadAgent

    } = useAppStore();

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

                loadAgent({

                    id: agent.id,

                    name: agent.name,

                    online: agent.status === "ONLINE",

                    lastHeartbeat: agent.lastHeartbeat

                });

            }

            catch (err) {

                console.error(err);

            }

        }

        load();

        socketService.connect();

        socketService.on<any[]>(

            "agents:update",

            (agents) => {

                if (agents.length === 0) {
                    
                    loadAgent({

                        id: "",

                        name: "",

                        online: false,

                        lastHeartbeat: 0

                    });

                    return;

                }

                const agent = agents[0];

                loadAgent({

                    id: agent.id,

                    name: agent.name,

                    online: agent.status === "ONLINE",

                    lastHeartbeat: agent.lastHeartbeat

                });

            }

        );

        return () => {

            console.log(
                "useAgent unmounted"
            );

            socketService.off(
                "agents:update"
            );

        };

    }, []);

}