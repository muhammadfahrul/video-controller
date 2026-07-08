import {

    useCallback

} from "react";

import {

    useAppStore

} from "../store/appStore";

import {

    playerCommandService

} from "../services";

export function usePlayerControls() {

    const {

        agent

    } = useAppStore();

    const ensureAgent = useCallback(() => {

        if (!agent.online) {

            console.warn(

                "[Player] Agent Offline"

            );

            return null;

        }

        return agent.id;

    }, [agent]);

    const play = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        playerCommandService.play(agentId);

    }, [ensureAgent]);

    const pause = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        playerCommandService.pause(agentId);

    }, [ensureAgent]);

    return {

        play,

        pause

    };

}