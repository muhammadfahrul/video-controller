import {
    socketService
} from "../socket";


import {
    useAppStore
} from "../../store/appStore";

import type { PlayerState } from "../../types/app/PlayerState";


export class PlayerStateListener {


    start(){


        socketService.on(

            "player:update",

            (payload: { player: PlayerState }) => {


                console.log(

                    "[PWA] Player Update",

                    payload

                );


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
                                player.videoId

                        }

                    );


            }

        );


    }


}