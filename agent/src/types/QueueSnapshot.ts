import { QueueItem } from "../queue/QueueItem";

export interface QueueSnapshot {

    items: QueueItem[];

    currentIndex: number;

    repeat: string;

    shuffle: boolean;

}