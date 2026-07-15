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
    setQueue
}=useAppStore();


const handleClearQueue = () => {
    
    // Optimistic update - langsung kosongkan queue
    setQueue({
        ...queue,
        items: [],
        currentIndex: -1
    });
    
    // Kirim perintah ke server
    playerCommandService.clearQueue(agent.id);
    
};


const handleShuffleQueue = () => {
    
    // Simpan video yang sedang diputar sebelum shuffle
    const currentVideoId = queue.currentIndex >= 0 
        ? queue.items[queue.currentIndex]?.videoId 
        : null;
    
    // Optimistic update - langsung shuffle array
    const shuffledItems = [...queue.items].sort(() => Math.random() - 0.5);
    
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
    
    // Kirim perintah ke server
    playerCommandService.shuffleQueue(agent.id);
    
};


const handleRepeat = (mode: string) => {
    
    // Optimistic update - langsung update repeat mode
    setQueue({
        ...queue,
        repeat: mode
    });
    
    // Kirim perintah ke server
    playerCommandService.repeat(agent.id, mode);
    
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

className="
px-3
py-1
text-sm
bg-gray-200
rounded
hover:bg-gray-300
"

>

Shuffle

</button>



<button

onClick={handleClearQueue}

className="
px-3
py-1
text-sm
bg-gray-200
rounded
hover:bg-gray-300
"

>

Clear

</button>


{
    
    repeatModes.map(({ mode, label }) => (
        
        <button
        
            key={mode}
            
            onClick={() => handleRepeat(mode)}
            
            className={
                `
                    px-3
                    py-1
                    text-sm
                    rounded
                    `
                +
                (queue.repeat === mode
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                )
            }
        
        >
        
            {label}
        
        </button>
        
    ))
    
}


</div>

);


}