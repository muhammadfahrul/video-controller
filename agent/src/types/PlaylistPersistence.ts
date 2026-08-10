import { PlaylistItem } from "../playlist/PlaylistItem";
import { RepeatMode } from "../playlist/RepeatMode";

export interface PlaylistPersistence {

    items: PlaylistItem[];

    currentIndex: number;

    repeat: RepeatMode;

    shuffle: boolean;

}