import { QueueItem } from "./QueueItem";


export class QueueManager {


    private queue: QueueItem[] = [];



    public add(
        item: QueueItem
    ): void {


        this.queue.push(item);


    }



    public remove(
        id:string
    ): void {


        this.queue =
            this.queue.filter(
                item =>
                    item.id !== id
            );


    }




    public clear():void{


        this.queue = [];


    }




    public next():QueueItem | null{


        return this.queue.shift()
            ?? null;


    }




    public peek():QueueItem | null{


        return this.queue[0]
            ?? null;


    }




    public getAll():QueueItem[]{


        return [
            ...this.queue
        ];


    }



    public size():number{


        return this.queue.length;


    }


}