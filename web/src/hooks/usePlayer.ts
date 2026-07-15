import { useEffect } from "react";

import {

    socketService

} from "../services";

import {

    useAppStore

} from "../store/appStore";

export function usePlayer() {

    const {

        setPlayer,

        setQueue

    } = useAppStore();

    useEffect(() => {

        socketService.on(

            "player:update",

            (payload: any) => {

                console.log(

                    "[PWA] player:update",

                    payload

                );

                if (payload.player) {                    
                    setPlayer({

                        playing: payload.player?.playing ?? false,

                        duration: payload.player?.duration ?? 0,

                        currentTime: payload.player?.currentTime ?? 0,

                        volume: payload.player?.volume ?? 50,

                        muted: payload.player?.muted ?? false,

                        fullscreen: payload.player?.fullscreen ?? false,

                        videoId: payload.player?.videoId,

                        title: payload.player?.title,

                        channel: payload.player?.channel,

                        thumbnail: payload.player?.thumbnail

                    });
                }

                if (payload.queue) {
                    setQueue(

                        payload.queue

                    );
                }

            }

        );

        return () => {

            socketService.off(

                "player:update"

            );

        };

    }, []);

}