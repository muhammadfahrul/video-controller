import {
    Router
} from "express";


import {
    AgentController
} from "../controllers/AgentController";


import {
    CommandController
} from "../controllers/CommandController";


import {
    SocketServer
} from "../socket/SocketServer";


import {
    CommandService
} from "../services/CommandService";

import { ServiceContainer } from "../container/ServiceContainer";



export function createApiRouter(
    container: ServiceContainer
){


    const router =
        Router();



    const agentController =
        new AgentController(
            container.getSocketServer()
        );



    const commandService =
        container.getCommandService();



    const commandController =
        new CommandController(
            commandService
        );



    router.get(
        "/agents",
        agentController.list.bind(
            agentController
        )
    );



    router.post(
        "/command",
        commandController.send.bind(
            commandController
        )
    );



    return router;

}