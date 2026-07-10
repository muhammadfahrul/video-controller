import path from "path";

import { JsonStorage } from "../persistence/JsonStorage";

import { QueuePersistence } from "../types/QueuePersistence";

import { RepeatMode } from "../queue/RepeatMode";

export class QueueRepository {

    private storage =

        new JsonStorage<QueuePersistence>(

            path.join(

                process.cwd(),

                "data",

                "queue.json"

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

        data: QueuePersistence

    ) {

        return this.storage.save(data);

    }

}