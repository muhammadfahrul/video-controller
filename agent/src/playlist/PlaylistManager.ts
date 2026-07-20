import { PlaylistItem } from "./PlaylistItem";


export class PlaylistManager {


    private playlist: PlaylistItem[] = [];



    public add(
        item: PlaylistItem
    ): void {


        this.playlist.push(item);


    }



    public remove(
        id:string
    ): void {


        this.playlist =
            this.playlist.filter(
                item =>
                    item.id !== id
            );


    }




    public clear():void{


        this.playlist = [];


    }




    public next():PlaylistItem | null{


        return this.playlist.shift()
            ?? null;


    }




    public peek():PlaylistItem | null{


        return this.playlist[0]
            ?? null;


    }




    public getAll():PlaylistItem[]{


        return [
            ...this.playlist
        ];


    }



    public size():number{


        return this.playlist.length;


    }


}