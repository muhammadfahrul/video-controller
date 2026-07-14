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

}


bootstrap();