import { useEffect } from "react";

import { agentService } from "../services";
import { socketService } from "../services";
import { useAppStore } from "../store/appStore";
import type { AgentDto } from "../services/agent/AgentService";

export function useAgent() {

    useEffect(() => {

        const loadAgent = (agent: AgentDto) => {
            useAppStore.getState().loadAgent({
                id: agent.id,
                name: agent.name,
                online: (agent.status === "ONLINE" || agent.status === "PLAYING") && agent.isActive === true,
                lastHeartbeat: agent.lastHeartbeat
            });
        };

        async function load() {

            try {

                const agents = await agentService.list();

                if (agents.length === 0) {

                    return;

                }

                loadAgent(agents[0]);

            }

            catch (err) {

                console.error(err);

            } finally {

                useAppStore.getState().setInitialLoading(false);

            }

        }

        load();

        socketService.connect();

        const handleAgentsUpdate = (agents: AgentDto[]) => {

            if (agents.length === 0) {
                
                useAppStore.getState().loadAgent({

                    id: "",

                    name: "",

                    online: false,

                    lastHeartbeat: 0

                });

                return;

            }

            loadAgent(agents[0]);

        };

        socketService.on<AgentDto[]>(

            "agents:update",

            handleAgentsUpdate

        );

        return () => {

            socketService.off(
                "agents:update",
                handleAgentsUpdate
            );

        };

    }, []);

}
