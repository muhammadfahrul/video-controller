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
    
    // Optimistic update - langsung shuffle array
    const shuffledItems = [...queue.items].sort(() => Math.random() - 0.5);
    
    setQueue({
        ...queue,
        items: shuffledItems
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


return (

<div
className="
flex
gap-2
"
>


<button

onClick={handleShuffleQueue}

>

Shuffle

</button>



<button

onClick={handleClearQueue}

>

Clear

</button>


<button

onClick={() => handleRepeat("ALL")}

>

Repeat All

</button>



</div>

);


}