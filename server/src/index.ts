import { createServer } from "http";

import { createApp } from "./app";

import { SocketServer } from "./socket/SocketServer";


const PORT = 3000;


// Buat app dulu
const app =
    createApp();


// HTTP server menggunakan Express
const httpServer =
    createServer(app);


// Socket.IO attach ke HTTP server yang sama
const socketServer =
    new SocketServer(
        httpServer
    );

app.get(
    "/agents",
    (req,res)=>{


        res.json(
            socketServer.getAgents()
        );


    }
);


// Ambil manager
const manager =
    socketServer.getManager();



httpServer.listen(
    PORT,
    ()=>{


        console.log(
            `Server running on ${PORT}`
        );


    }
);