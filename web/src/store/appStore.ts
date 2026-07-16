import { create } from "zustand";

import type {

    AgentState

} from "../types/app/AgentState";

import type {

    PlayerState

} from "../types/app/PlayerState";

import type {

    QueueState

} from "../types/app/QueueState";

import type {

    SearchState

} from "../types/app/SearchState";

interface ProcessingState {

    play: boolean;

    pause: boolean;

    stop: boolean;

    next: boolean;

    previous: boolean;

    volume: boolean;

    mute: boolean;

    fullscreen: boolean;

    search: boolean;

    addToQueue: boolean;

    removeFromQueue: boolean;

    skipAd: boolean;

    clearQueue: boolean;

    shuffleQueue: boolean;

    repeat: boolean;

}

interface AppStore {

    agent: AgentState;

    player: PlayerState;

    queue: QueueState;

    search: SearchState;

    processing: ProcessingState;

    setAgent(
        value: Partial<AgentState>
    ): void;

    setPlayer(
        value: Partial<PlayerState>
    ): void;

    setQueue(
        value: QueueState
    ): void;

    setSearch(
        value: Partial<SearchState>
    ): void;

    setProcessing(
        key: keyof ProcessingState,
        value: boolean
    ): void;

    removingItemId: string | null;

    setRemovingItemId(
        id: string | null
    ): void;

    addingToQueue: boolean;

    setAddingToQueue(
        value: boolean
    ): void;

    globalLoading: boolean;

    setGlobalLoading(
        value: boolean
    ): void;

    initialLoading: boolean;

    setInitialLoading(
        value: boolean
    ): void;

    loadAgent(
        value: AgentState
    ): void;

}

export const useAppStore =

create<AppStore>((set)=>({

    agent:{

        id:"",

        name:"",

        online:false,

        lastHeartbeat:0

    },

    player: {

        playing: false,

        volume: 50,

        muted: false,

        fullscreen: false,

        currentTime: 0,

        duration: 0,

        videoId: undefined

    },

    queue: {

        items: [],

        currentIndex: -1,

        repeat: "OFF",

        shuffle: false

    },

    search:{

        keyword:"",

        results:[]

    },

    processing:{

        play: false,

        pause: false,

        stop: false,

        next: false,

        previous: false,

        volume: false,

        mute: false,

        fullscreen: false,

        search: false,

        addToQueue: false,

        removeFromQueue: false,

        clearQueue: false,

        shuffleQueue: false,

        repeat: false,

        skipAd: false

    },

    removingItemId: null as string | null,

    globalLoading: false,

    initialLoading: true,

    setInitialLoading:(value)=>set({ initialLoading:value }),

    setGlobalLoading:(value)=>set({ globalLoading:value }),

    setAgent:(value)=>

        set(state=>({

            agent:{

                ...state.agent,

                ...value

            }

        })),

    setPlayer:(value)=>

        set(state=>({

            player:{

                ...state.player,

                ...value

            }

        })),

    setQueue:(queue)=>

        set({

            queue

        }),

    setSearch:(value)=>

        set(state=>({

            search:{

                ...state.search,

                ...value

            }

        })),

    setProcessing:(key, value)=>

        set(state=>{

            const newProcessing = {

                ...state.processing,

                [key]:value

            };

            const hasAnyProcessing = Object.values(newProcessing).some(v=>v);

            return {

                processing:newProcessing,

                globalLoading:hasAnyProcessing

            };

        }),

    setRemovingItemId:(id)=>

        set({

            removingItemId: id

        }),

    addingToQueue: false,

    setAddingToQueue:(value)=>

        set({

            addingToQueue: value,

            globalLoading: value

        }),

    loadAgent:(value)=>

        set({

            agent:value

        }),
}));