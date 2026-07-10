import { Agent } from "./core/Agent";
import { LoggerService } from "./services/LoggerService";
import {
 CommandDispatcher,
 CommandType,
 PlayHandler,
 PauseHandler,
 VolumeHandler,
 FullscreenHandler
} from "./commands";
import { QueueRepository } from "./repositories/QueueRepository";
import { RepeatMode } from "./queue/RepeatMode";


async function bootstrap(){


    const agent =
        new Agent();



    await agent.start();



    const queue =
        agent.getQueue();



    queue.add({

        id:"1",

        videoId:"dQw4w9WgXcQ",

        title:
            "Video pertama",

        addedAt:
            Date.now()

    });



    const player =
        agent.getPlayer();



    const first =
        queue.current();



    if(first){

        await player.open(
            first.videoId
        );

        await player.play();


    }

    await player.fullscreen();

    await player.setVolume(50);

    await player.play();

    const repository =

    new QueueRepository();

    const queue2 =

        await repository.load();

    console.log(queue2);

    await repository.save({

        items: [],

        currentIndex: -1,

        repeat: RepeatMode.OFF,

        shuffle: false

    });
}


bootstrap();