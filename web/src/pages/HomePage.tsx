import {

    useState

} from "react";

import AgentStatusCard
from "../features/agent/components/AgentStatusCard";

import SearchBar
from "../features/search/components/SearchBar";

import SearchResultCard
from "../features/search/components/SearchResultCard";

import QueuePanel
from "../features/queue/components/QueuePanel";

import PlayerControls
from "../features/player/components/PlayerControls";

import {

    useEffect

} from "react";

import {

    agentService,
    apiService

} from "../services";

import {

    socketService

} from "../services";
import { useAppStore } from "../store/appStore";

export default function HomePage(){

    const [

        keyword,

        setKeyword

    ]=useState("");

    const queue = [

        {

            id:"1",

            videoId:"dQw4w9WgXcQ",

            title:"Never Gonna Give You Up",

            channel:"RickAstleyVEVO",

            duration:"3:32",

            thumbnail:
            "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"

        },

        {

            id:"2",

            videoId:"M7lc1UVf-VE",

            title:"YouTube API Demo",

            channel:"Google Developers",

            duration:"4:10",

            thumbnail:
            "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg"

        }

    ];

    const {

        agent,

        setAgent,

        loadAgent

    } = useAppStore();

    useEffect(() => {

        setAgent({

            id:"windows-agent-01",

            name:"Windows Player",

            online:true,

            lastHeartbeat:Date.now()

        });

        apiService
            .get("/api/agents")
            .then(console.log)
            .catch(console.error);

        async function load() {

            try {

                const agents =

                    await agentService.list();

                if (agents.length === 0) {

                    return;

                }

                const agent = agents[0];

                loadAgent({

                    id: agent.id,

                    name: agent.name,

                    online:

                        agent.status === "ONLINE",

                    lastHeartbeat:

                        agent.lastHeartbeat

                });

            }

            catch (err) {

                console.error(err);

            }

        }

        load();


        socketService.connect();

        return () => {

            socketService.disconnect();

        };

    }, []);

    return(

        <div
            className="
                space-y-5
            "
        >

            <AgentStatusCard

                agent={{

                    id:agent.id,

                    name:agent.name,

                    status:

                        agent.online

                            ? "ONLINE"

                            : "OFFLINE",

                    lastHeartbeat:

                        agent.lastHeartbeat

                }}

            />

            <SearchBar

                value={keyword}

                onChange={setKeyword}

            />

            <SearchResultCard

                result={{

                    id:"1",

                    title:"Rick Astley - Never Gonna Give You Up",

                    channel:"RickAstleyVEVO",

                    duration:"3:32",

                    thumbnail:
                    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"

                }}

            />

            <QueuePanel

                items={queue}

            />

            <PlayerControls />

        </div>

    );

}