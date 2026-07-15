import {
    socketService
} from "./SocketService";


import {
    useAppStore
} from "../../store/appStore";

import type { QueueState } from "../../types/app/QueueState";


export function registerQueueListener(){

    // Listen to queue:state for initial queue state
    socketService.on(

        "queue:state",

        (snapshot: QueueState) => {


            console.log(

                "[PWA] Queue State",

                snapshot

            );


            useAppStore
                .getState()
                .setQueue(

                    snapshot

                );

            console.log(
                "[QueueListener] Updated queue state:",
                snapshot.currentIndex,
                snapshot.items.length
            );


        }

    );


    // Also listen to queue:update for queue changes
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

            console.log(
                "[QueueListener] Updated queue from update:",
                snapshot.currentIndex,
                snapshot.items.length
            );


        }

    );


}