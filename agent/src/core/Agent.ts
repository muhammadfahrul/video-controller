import {
 BrowserService
} from "../services/BrowserService";


import {
 PlayerService
} from "../services/PlayerService";


import {
 QueueService
} from "../services/QueueService";


export class Agent {


    private browser:
        BrowserService;


    private player?:
        PlayerService;


    private queue:
        QueueService;



    constructor(){


        this.browser =
            new BrowserService();



        this.queue =
            new QueueService();


    }




    async start(){


        await this.browser.start();



        this.player =
            new PlayerService(
                this.browser.getPage()
            );


    }




    getPlayer(){

        if(!this.player){

            throw new Error(
                "Player not ready"
            );

        }


        return this.player;

    }




    getQueue(){

        return this.queue;

    }



}