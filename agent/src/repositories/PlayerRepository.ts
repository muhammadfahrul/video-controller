import path from "path";

import { JsonStorage } from "../persistence/JsonStorage";

import type { PlayerPersistence } from "../types/PlayerPersistence";

export class PlayerRepository {

    private storage =

        new JsonStorage<PlayerPersistence>(

            path.join(

                process.cwd(),

                "data",

                "player.json"

            ),

            {

                player: {

                    playing: false,

                    currentTime: 0,

                    duration: 0,

                    volume: 100,

                    muted: false,

                    fullscreen: false,

                    videoId: ""

                }

            }

        );

    load() {

        return this.storage.load();

    }

    save(

        data: PlayerPersistence

    ) {

        return this.storage.save(data);

    }

}