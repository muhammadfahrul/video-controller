import {
    playerCommandService
} from "../../../services/player";


import {
    useAppStore
} from "../../../store/appStore";


export default function PlaylistToolbar(){


const {
    agent,
    playlist,
    processing,
    setProcessing
}=useAppStore();


const handleClearPlaylist = () => {
    if (!agent.online) return;
    
    // Set processing state
    setProcessing("clearPlaylist", true);
    
    // Send command to server - wait for response before updating UI
    playerCommandService.clearPlaylist(agent.id);
    
    setTimeout(() => setProcessing("clearPlaylist", false), 500);
    
};

const handleShufflePlaylist = () => {
    if (!agent.online) return;
    
    // Set processing state
    setProcessing("shufflePlaylist", true);
    
    // Send command to server - wait for response before updating UI
    // Server will broadcast new playlist state after shuffle completes
    playerCommandService.shufflePlaylist(agent.id);
    
    // Reset processing state after delay (from server response)
    setTimeout(() => setProcessing("shufflePlaylist", false), 500);
    
};


const handleRepeat = (mode: string) => {
    if (!agent.online) return;
    
    // Set processing state
    setProcessing("repeat", true);
    
    // Send command to server - wait for response before updating UI
    playerCommandService.repeat(agent.id, mode);
    
    setTimeout(() => setProcessing("repeat", false), 500);
    
};

const repeatModes = [
    { mode: "OFF", label: "Repeat Off" },
    { mode: "ALL", label: "Repeat All" },
    { mode: "ONE", label: "Repeat One" }
];


return (

<div
className="
flex
gap-2
flex-wrap
"
>


<button

onClick={handleShufflePlaylist}

disabled={processing.shufflePlaylist || !agent.online}

className={`
px-3
py-1
text-sm
rounded
${processing.shufflePlaylist || !agent.online
    ? "bg-[#2a2a4a] cursor-not-allowed text-gray-400" 
    : "bg-[#1a1a2e] hover:bg-[#252542] text-[#00f0ff] border border-[#00f0ff]"}
`}

>

{processing.shufflePlaylist ? "Shuffling..." : "Shuffle"}

</button>



<button

onClick={handleClearPlaylist}

disabled={processing.clearPlaylist || !agent.online}

className={`
px-3
py-1
text-sm
rounded
${processing.clearPlaylist || !agent.online
    ? "bg-[#2a2a4a] cursor-not-allowed text-gray-400" 
    : "bg-[#1a1a2e] hover:bg-[#252542] text-[#ff2d95] border border-[#ff2d95]"}
`}

>

{processing.clearPlaylist ? "Clearing..." : "Clear"}

</button>


{
    
    repeatModes.map(({ mode, label }) => (
        
        <button
        
            key={mode}
            
            onClick={() => handleRepeat(mode)}
            
            disabled={processing.repeat || !agent.online}
            
            className={
                `
                    px-3
                    py-1
                    text-sm
                    rounded
                    `
                +
                (playlist.repeat === mode
                    ? (processing.repeat || !agent.online)
                        ? "bg-[#a855f7] cursor-not-allowed text-white"
                        : "bg-[#a855f7] text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    : (processing.repeat || !agent.online)
                        ? "bg-[#2a2a4a] cursor-not-allowed text-gray-400"
                        : "bg-[#1a1a2e] hover:bg-[#252542] text-[#a855f7] border border-[#a855f7]"
                )
            }
        
        >
        
            {processing.repeat ? "..." : label}
        
        </button>
        
    ))
    
}


</div>

);


}