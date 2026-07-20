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
import { PlaylistRepository } from "./repositories/PlaylistRepository";
import { RepeatMode } from "./playlist/RepeatMode";


async function bootstrap(){


    const agent =
        new Agent();



    await agent.start();

}


bootstrap();