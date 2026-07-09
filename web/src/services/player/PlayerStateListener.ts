import {
    socketService
} from "../socket";


import {
    useAppStore
} from "../../store/appStore";


export class PlayerStateListener {


    start(){


        socketService.on(

            "player:update",

            payload=>{


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