import { useEffect } from "react";

import {

    socketService

} from "../services";

import {

    useAppStore

} from "../store/appStore";

export function usePlayer() {

    const {

        setPlayer

    } = useAppStore();

    useEffect(() => {

        socketService.on(

            "player:update",

            (payload: any) => {

                console.log(

                    "[PWA] player:update",

                    payload

                );

                setPlayer(

                    payload.player

                );

            }

        );

        return () => {

            socketService.off(

                "player:update"

            );

        };

    }, []);

}