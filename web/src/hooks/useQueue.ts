import { useEffect } from "react";
import { socketService } from "../services";
import { useAppStore } from "../store/appStore";
import type { QueueState } from "../types/app/QueueState";

export function useQueue() {

    const {

        setQueue

    } = useAppStore();

    useEffect(() => {

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

            socketService.off(

                "queue:update"

            );

        };

    }, []);

}