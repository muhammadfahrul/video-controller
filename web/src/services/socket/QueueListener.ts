import {
    socketService
} from "./SocketService";


import {
    useAppStore
} from "../../store/appStore";

import type { QueueState } from "../../types/app/QueueState";


export function registerQueueListener(){


    socketService.on(

        "queue:update",

        (snapshot: QueueState) => {


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