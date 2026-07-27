import {
    socketService
} from "../socket";


import {
    useAppStore
} from "../../store/appStore";

import type { PlayerState } from "../../types/app/PlayerState";
import type { PlaylistState } from "../../types/app/PlaylistState";


export class PlayerStateListener {


    start(){

        // Listen to player:state for initial player state
        socketService.on(

            "player:state",

            (payload: { player: PlayerState; playlist?: PlaylistState }) => {


                const {

                    player

                } = payload;



                if(!player){

                    return;

                }



                useAppStore
                    .getState()
                    .setPlayer(

                        {

                            playing:
                                player.playing,


                            currentTime:
                                player.currentTime,


                            duration:
                                player.duration,


                            volume:
                                player.volume,


                            muted:
                                player.muted,


                            fullscreen:
                                player.fullscreen,


                            videoId:
                                player.videoId,


                            title:
                                player.title,


                            channel:
                                player.channel,


                            thumbnail:
                                player.thumbnail

                        }

                    );

                if (payload.playlist) {
                    useAppStore.getState().setPlaylist(payload.playlist);
                }

            }

        );


        // Listen to player:update for player changes
        socketService.on(

            "player:update",

            (payload: { player: PlayerState; playlist?: PlaylistState }) => {


                const {

                    player

                } = payload;



                if(!player){

                    return;

                }



                useAppStore
                    .getState()
                    .setPlayer(

                        {

                            playing:
                                player.playing,


                            currentTime:
                                player.currentTime,


                            duration:
                                player.duration,


                            volume:
                                player.volume,


                            muted:
                                player.muted,


                            fullscreen:
                                player.fullscreen,


                            videoId:
                                player.videoId,


                            title:
                                player.title,


                            channel:
                                player.channel,


                            thumbnail:
                                player.thumbnail

                        }

                    );

                if (payload.playlist) {
                    useAppStore.getState().setPlaylist(payload.playlist);
                }


            }

        );


    }


}
