import {
    SocketServer
} from "../socket/SocketServer";


export class AppContainer {

    private socketServer?:
        SocketServer;


    setSocketServer(
        socket:SocketServer
    ){

        this.socketServer = socket;

    }



    getSocketServer(){

        return this.socketServer!;

    }

}