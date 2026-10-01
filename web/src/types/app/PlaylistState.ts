export interface PlaylistItem {

    id:string;

    videoId:string;

    title:string;

    thumbnail:string;

    channel:string;

    duration:string;

}



export interface PlaylistState {

    items:PlaylistItem[];

    currentIndex:number;

    repeat:string;

    shuffle:boolean;

}