import { useEffect } from "react";
import { socketService } from "../services";
import { useAppStore } from "../store/appStore";

export function useQueue() {

    const {

        setQueue

    } = useAppStore();

    useEffect(() => {

        socketService.on(

            "queue:update",

            snapshot => {

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