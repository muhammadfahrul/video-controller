import path from "path";

import { JsonStorage } from "../persistence/JsonStorage";

import { PlaylistPersistence } from "../types/PlaylistPersistence";

import { RepeatMode } from "../playlist/RepeatMode";

export class PlaylistRepository {

    private storage =

        new JsonStorage<PlaylistPersistence>(

            path.join(

                process.cwd(),

                "data",

                "playlist.json"

            ),

            {

                items: [],

                currentIndex: -1,

                repeat: RepeatMode.OFF,

                shuffle: false

            }

        );

    load() {

        return this.storage.load();

    }

    save(

        data: PlaylistPersistence

    ) {

        return this.storage.save(data);

    }

}