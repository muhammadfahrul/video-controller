import {
    socketService
} from "./SocketService";


import {
    useAppStore
} from "../../store/appStore";

import type { PlaylistState } from "../../types/app/PlaylistState";


export function registerPlaylistListener(){

    // Listen to playlist:state for initial playlist state
    socketService.on(

        "playlist:state",

        (snapshot: PlaylistState) => {


            console.log(

                "[PWA] Playlist State",

                snapshot

            );


            useAppStore
                .getState()
                .setPlaylist(

                    snapshot

                );

            console.log(
                "[PlaylistListener] Updated playlist state:",
                snapshot.currentIndex,
                snapshot.items.length
            );


        }

    );


    // Also listen to playlist:update for playlist changes
    socketService.on(

        "playlist:update",

        (snapshot: PlaylistState) => {


            console.log(

                "[PWA] Playlist Update",

                snapshot

            );


            useAppStore
                .getState()
                .setPlaylist(

                    snapshot

                );

            console.log(
                "[PlaylistListener] Updated playlist from update:",
                snapshot.currentIndex,
                snapshot.items.length
            );


        }

    );


}