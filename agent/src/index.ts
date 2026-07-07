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



    queue.add({

        id:"2",

        videoId:"M7lc1UVf-VE",

        title:
            "Video kedua",

        addedAt:
            Date.now()

    });



    const player =
        agent.getPlayer();



    const first =
        queue.next();



    if(first){

        await player.open(
            first.videoId
        );

        await player.play();


    }

    await player.fullscreen();

    await player.setVolume(50);

    await player.play();
}


bootstrap();