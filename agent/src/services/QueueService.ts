import {
    QueueManager,
    QueueItem
} from "../queue";


export class QueueService {


    private readonly queue:
        QueueManager;



    constructor(){

        this.queue =
            new QueueManager();

    }



    add(
        item:QueueItem
    ){

        this.queue.add(item);

    }



    next(){

        return this.queue.next();

    }



    getAll(){

        return this.queue.getAll();

    }


}