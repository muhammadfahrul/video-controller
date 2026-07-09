import { Page } from "playwright";

import {
    YouTubePlayer
} from "../player";

import {

    PlayerSnapshot

} from "../types/PlayerSnapshot";


export class PlayerService {


    private player:
        YouTubePlayer;

    private onEnded?: () => void;



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

    public async openVideo(
        videoId: string
    ) {

        await this.open(
            videoId
        );

        await this.play();

    }


    async play(){

        console.log(

            "[PLAYER] play()"

        );
        
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

        console.log(
            "PlayerService.setVolume",
            value
        );
        
        await this.player.setVolume(value);

    }

    public async seek(
        seconds: number
    ) {

        await this.player.seek(
            seconds
        );

    }

    public async mute() {

        await this.player.mute();

    }

    public async unmute() {

        await this.player.unmute();

    }

    public async stop() {

        await this.player.stop();

    }

    public async fullscreen() {

        console.log(
            "PlayerService.fullscreen"
        );

        await this.player.fullscreen();

    }

    public async exitFullscreen() {

        await this.player.exitFullscreen();

    }

    public async toggleFullscreen() {

        await this.player.toggleFullscreen();

    }

    public async getSnapshot()
    : Promise<PlayerSnapshot> {

        return await this.player
            .getSnapshot();

    }

    public setOnEnded(
        callback:()=>void
    ){

        this.onEnded =
            callback;

        this.player.setOnEnded(
            callback
        );

    }
}