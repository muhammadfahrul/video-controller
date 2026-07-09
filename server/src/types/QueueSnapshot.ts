export interface QueueSnapshot {

    items: {

        id: string;

        videoId: string;

        title: string;

        channel: string;

        duration: string;

        thumbnail: string;

    }[];

    currentIndex: number;

    repeat: string;

    shuffle: boolean;

}