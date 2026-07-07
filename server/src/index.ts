import {
    createApp
} from "./app";


import {
    createServer
} from "http";


import {
    SocketServer
} from "./socket/SocketServer";


const PORT = 3000;


const app =
    createApp();


const httpServer =
    createServer(app);



new SocketServer(
    httpServer
);



httpServer.listen(
    PORT,
    ()=>{


        console.log(
            `Server running ${PORT}`
        );


    }
);