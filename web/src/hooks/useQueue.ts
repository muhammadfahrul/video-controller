import { useEffect } from "react";
import { socketService } from "../services";
import { useAppStore } from "../store/appStore";
import type { QueueState } from "../types/app/QueueState";

export function useQueue() {

    const {

        setQueue

    } = useAppStore();

    useEffect(() => {

        // Listen to queue:state for initial queue state
        socketService.on(

            "queue:state",

            (snapshot: QueueState) => {

                console.log(

                    "[PWA] queue:state",

                    snapshot

                );

                setQueue(snapshot);

            }

        );

        // Listen to queue:update for queue changes
        socketService.on(

            "queue:update",

            (snapshot: QueueState) => {

                console.log(

                    "[PWA] queue:update",

                    snapshot

                );

                setQueue(snapshot);

            }

        );

        return () => {

            socketService.off("queue:state");
            socketService.off("queue:update");

        };

    }, []);

}