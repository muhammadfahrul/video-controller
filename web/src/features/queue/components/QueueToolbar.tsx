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
    setQueue,
    processing,
    setProcessing
}=useAppStore();


const handleClearQueue = () => {
    
    // Optimistic update - langsung kosongkan queue
    setQueue({
        ...queue,
        items: [],
        currentIndex: -1
    });
    
    // Set processing state
    setProcessing("clearQueue", true);
    
    // Kirim perintah ke server
    playerCommandService.clearQueue(agent.id);
    
    setTimeout(() => setProcessing("clearQueue", false), 500);
    
};


// Fisher-Yates shuffle algorithm - proper unbiased shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};


const handleShuffleQueue = () => {
    
    // Simpan video yang sedang diputar sebelum shuffle
    const currentVideoId = queue.currentIndex >= 0 
        ? queue.items[queue.currentIndex]?.videoId 
        : null;
    
    // Optimistic update - langsung shuffle array dengan algoritma yang benar
    const shuffledItems = shuffleArray(queue.items);
    
    // Update currentIndex agar sesuai dengan video yang sedang diputar
    let newCurrentIndex = -1;
    if (currentVideoId) {
        newCurrentIndex = shuffledItems.findIndex(
            item => item.videoId === currentVideoId
        );
    }
    
    setQueue({
        ...queue,
        items: shuffledItems,
        currentIndex: newCurrentIndex,
        shuffle: true
    });
    
    // Set processing state
    setProcessing("shuffleQueue", true);
    
    // Kirim perintah ke server
    playerCommandService.shuffleQueue(agent.id);
    
    setTimeout(() => setProcessing("shuffleQueue", false), 500);
    
};


const handleRepeat = (mode: string) => {
    
    // Optimistic update - langsung update repeat mode
    setQueue({
        ...queue,
        repeat: mode
    });
    
    // Set processing state
    setProcessing("repeat", true);
    
    // Kirim perintah ke server
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