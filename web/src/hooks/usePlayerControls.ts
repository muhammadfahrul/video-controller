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

        agent,

        setProcessing

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

    const clearProcessing = useCallback((action: string) => {

        setTimeout(() => setProcessing(action as any, false), 2000);

    }, [setProcessing]);

    const play = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("play", true);

        playerCommandService.play(agentId);

        clearProcessing("play");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const pause = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("pause", true);

        playerCommandService.pause(agentId);

        clearProcessing("pause");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const stop = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("stop", true);

        playerCommandService.stop(agentId);

        clearProcessing("stop");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const next = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("next", true);

        playerCommandService.next(agentId);

        clearProcessing("next");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const previous = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("previous", true);

        playerCommandService.previous(agentId);

        clearProcessing("previous");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const setVolume = useCallback((volume: number) => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("volume", true);

        playerCommandService.setVolume(agentId, volume);

        clearProcessing("volume");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const toggleMute = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("mute", true);

        playerCommandService.toggleMute(agentId);

        clearProcessing("mute");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const toggleFullscreen = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("fullscreen", true);

        playerCommandService.toggleFullscreen(agentId);

        clearProcessing("fullscreen");

    }, [ensureAgent, clearProcessing, setProcessing]);

    const skipAd = useCallback(() => {

        const agentId = ensureAgent();

        if (!agentId) {

            return;

        }

        setProcessing("skipAd", true);

        playerCommandService.skipAd(agentId);

        clearProcessing("skipAd");

    }, [ensureAgent, clearProcessing, setProcessing]);

    return {

        play,

        pause,

        stop,

        next,

        previous,

        setVolume,

        toggleMute,

        toggleFullscreen,

        skipAd

    };

}