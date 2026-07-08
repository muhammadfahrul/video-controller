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

interface AppStore {

    agent: AgentState;

    player: PlayerState;

    queue: QueueState;

    search: SearchState;

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

}

export const useAppStore =

create<AppStore>((set)=>({

    agent:{

        id:"",

        name:"",

        online:false,

        lastHeartbeat:0

    },

    player:{

        playing:false,

        volume:50,

        muted:false,

        fullscreen:false

    },

    queue:{

        items:[]

    },

    search:{

        keyword:"",

        results:[]

    },

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

        }))

}));