import {

    useEffect

} from "react";

import {

    socketService

} from "../services";

import {

    useAppStore

} from "../store/appStore";

import type {

    PlayerSnapshot

} from "../types/player/PlayerSnapshot";

export function usePlayer() {

    const {

        setPlayer

    } = useAppStore();

    useEffect(() => {

        socketService.on<PlayerSnapshot>(

            "player:update",

            (snapshot) => {

                console.log(

                    "[PWA] player:update",

                    snapshot

                );

                setPlayer(snapshot);

            }

        );

        return () => {

            socketService.off(

                "player:update"

            );

        };

    }, []);

}