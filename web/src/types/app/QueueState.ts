import type {

    QueueItem

} from "../../features/queue/types/QueueItem";

export interface QueueState {

    items: QueueItem[];

    currentIndex: number;

    repeat: string;

    shuffle: boolean;

}