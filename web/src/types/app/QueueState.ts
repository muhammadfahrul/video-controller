export interface QueueItem {

    id:string;

    videoId:string;

    title:string;

    thumbnail:string;

    channel:string;

    duration:string;

}



export interface QueueState {

    items:QueueItem[];

    currentIndex:number;

    repeat:string;

    shuffle:boolean;

}