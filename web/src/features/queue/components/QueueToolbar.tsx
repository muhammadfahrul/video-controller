import {
    playerCommandService
} from "../../../services/player";


import {
    useAppStore
} from "../../../store/appStore";


export default function QueueToolbar(){


const {
    agent,
    queue,
    processing,
    setProcessing
}=useAppStore();


const handleClearQueue = () => {
    
    // Set processing state
    setProcessing("clearQueue", true);
    
    // Kirim perintah ke server - tunggu response sebelum update UI
    playerCommandService.clearQueue(agent.id);
    
    setTimeout(() => setProcessing("clearQueue", false), 500);
    
};

const handleShuffleQueue = () => {
    
    // Set processing state
    setProcessing("shuffleQueue", true);
    
    // Kirim perintah ke server - tunggu response sebelum update UI
    // Server akan broadcast queue state baru setelah shuffle selesai
    playerCommandService.shuffleQueue(agent.id);
    
    // Reset processing state setelah delay (dari server response)
    setTimeout(() => setProcessing("shuffleQueue", false), 500);
    
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

onClick={handleShuffleQueue}

disabled={processing.shuffleQueue}

className={`
px-3
py-1
text-sm
rounded
${processing.shuffleQueue 
    ? "bg-gray-300 cursor-not-allowed" 
    : "bg-gray-200 hover:bg-gray-300"}
`}

>

{processing.shuffleQueue ? "Shuffling..." : "Shuffle"}

</button>



<button

onClick={handleClearQueue}

disabled={processing.clearQueue}

className={`
px-3
py-1
text-sm
rounded
${processing.clearQueue 
    ? "bg-gray-300 cursor-not-allowed" 
    : "bg-gray-200 hover:bg-gray-300"}
`}

>

{processing.clearQueue ? "Clearing..." : "Clear"}

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
                (queue.repeat === mode
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