import {
    socketService
} from "./SocketService";


import {
    useAppStore
} from "../../store/appStore";


export function registerQueueListener(){


    socketService.on(

        "queue:update",

        (snapshot)=>{


            console.log(

                "[PWA] Queue Update",

                snapshot

            );


            useAppStore
                .getState()
                .setQueue(

                    snapshot

                );


        }

    );


}