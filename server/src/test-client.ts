import { io } from "socket.io-client";


const socket =
    io(
        `http://localhost:${process.env.PORT || 3000}`,
        {
            auth: {
                token: process.env.VC_SHARED_SECRET
            }
        }
    );


socket.on(
    "connect",
    ()=>{


        console.log(
            "connected",
            socket.id
        );



        socket.emit(
            "agent:register",
            {

                id:"windows-01",

                name:"PC Ruang Tamu"

            }
        );


    }
);