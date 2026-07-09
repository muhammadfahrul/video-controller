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
                    setPlayer(
    
                        payload.player
    
                    );
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