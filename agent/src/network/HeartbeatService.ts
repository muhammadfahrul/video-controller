import {
    SocketClient
} from "./SocketClient";


export class HeartbeatService {


    private timer?:
        NodeJS.Timeout;



    constructor(
        private readonly socket:
            SocketClient,

        private readonly interval =
            5000
    ){}




    start(){


        this.timer =
            setInterval(
                ()=>{


                    this.socket
                    .sendHeartbeat();


                },
                this.interval
            );


    }




    stop(){


        if(this.timer){

            clearInterval(
                this.timer
            );

        }


    }


}