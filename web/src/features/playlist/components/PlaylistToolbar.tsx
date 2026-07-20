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
    
    // Set processing state
    setProcessing("clearPlaylist", true);
    
    // Kirim perintah ke server - tunggu response sebelum update UI
    playerCommandService.clearPlaylist(agent.id);
    
    setTimeout(() => setProcessing("clearPlaylist", false), 500);
    
};

const handleShufflePlaylist = () => {
    
    // Set processing state
    setProcessing("shufflePlaylist", true);
    
    // Kirim perintah ke server - tunggu response sebelum update UI
    // Server akan broadcast playlist state baru setelah shuffle selesai
    playerCommandService.shufflePlaylist(agent.id);
    
    // Reset processing state setelah delay (dari server response)
    setTimeout(() => setProcessing("shufflePlaylist", false), 500);
    
};


const handleRepeat = (mode: string) => {
    
    // Set processing state
    setProcessing("repeat", true);
    
    // Kirim perintah ke server - tunggu response sebelum update UI
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

disabled={processing.shufflePlaylist}

className={`
px-3
py-1
text-sm
rounded
${processing.shufflePlaylist 
    ? "bg-gray-300 cursor-not-allowed" 
    : "bg-gray-200 hover:bg-gray-300"}
`}

>

{processing.shufflePlaylist ? "Shuffling..." : "Shuffle"}

</button>



<button

onClick={handleClearPlaylist}

disabled={processing.clearPlaylist}

className={`
px-3
py-1
text-sm
rounded
${processing.clearPlaylist 
    ? "bg-gray-300 cursor-not-allowed" 
    : "bg-gray-200 hover:bg-gray-300"}
`}

>

{processing.clearPlaylist ? "Clearing..." : "Clear"}

</button>


{
    
    repeatModes.map(({ mode, label }) => (
        
        <button
        
            key={mode}
            
            onClick={() => handleRepeat(mode)}
            
            disabled={processing.repeat}
            
            className={
                `
                    px-3
                    py-1
                    text-sm
                    rounded
                    `
                +
                (playlist.repeat === mode
                    ? processing.repeat
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-500 text-white"
                    : processing.repeat
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-gray-200 hover:bg-gray-300"
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