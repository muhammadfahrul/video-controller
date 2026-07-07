import { Page } from "playwright";

import {
    YouTubePlayer
} from "../player";


export class PlayerService {


    private player:
        YouTubePlayer;



    constructor(
        page:Page
    ){

        this.player =
            new YouTubePlayer(page);

    }



    getPlayer(){

        return this.player;

    }



    async open(
        videoId:string
    ){

        await this.player.open(videoId);

    }



    async play(){

        await this.player.play();

    }



    async pause(){

        await this.player.pause();

    }



    async volume(
        value:number
    ){

        await this.player.setVolume(value);

    }

    async setVolume(
        value:number
    ){

        await this.player.setVolume(value);

    }


}