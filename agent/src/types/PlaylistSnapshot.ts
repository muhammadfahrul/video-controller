import { PlaylistItem } from "../playlist/PlaylistItem";

export interface PlaylistSnapshot {

    items: PlaylistItem[];

    currentIndex: number;

    repeat: string;

    shuffle: boolean;

}