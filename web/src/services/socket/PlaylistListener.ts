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


            useAppStore
                .getState()
                .setPlaylist(

                    snapshot

                );

        }

    );


    // Also listen to playlist:update for playlist changes
    socketService.on(

        "playlist:update",

        (snapshot: PlaylistState) => {


            useAppStore
                .getState()
                .setPlaylist(

                    snapshot

                );

        }

    );


}
