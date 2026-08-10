import { useEffect } from "react";
import { socketService } from "../services";
import { useAppStore } from "../store/appStore";
import type { PlaylistState } from "../types/app/PlaylistState";

export function usePlaylist() {

    const {

        setPlaylist

    } = useAppStore();

    useEffect(() => {

        // Listen to playlist:state for initial playlist state
        socketService.on(

            "playlist:state",

            (snapshot: PlaylistState) => {

                console.log(

                    "[PWA] playlist:state",

                    snapshot

                );

                setPlaylist(snapshot);

            }

        );

        // Listen to playlist:update for playlist changes
        socketService.on(

            "playlist:update",

            (snapshot: PlaylistState) => {

                console.log(

                    "[PWA] playlist:update",

                    snapshot

                );

                setPlaylist(snapshot);

            }

        );

        return () => {

            socketService.off("playlist:state");
            socketService.off("playlist:update");

        };

    }, []);

}