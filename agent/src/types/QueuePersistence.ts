import { QueueItem } from "../queue/QueueItem";
import { RepeatMode } from "../queue/RepeatMode";

export interface QueuePersistence {

    items: QueueItem[];

    currentIndex: number;

    repeat: RepeatMode;

    shuffle: boolean;

}