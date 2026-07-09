import {
    playerCommandService
} from "../../../services/player";


import {
    useAppStore
} from "../../../store/appStore";


export default function QueueToolbar(){


const {
    agent
}=useAppStore();



return (

<div
className="
flex
gap-2
"
>


<button

onClick={()=>


playerCommandService
.shuffleQueue(
    agent.id
)

}

>

Shuffle

</button>



<button

onClick={()=>


playerCommandService
.clearQueue(
    agent.id
)

}

>

Clear

</button>


<button

onClick={()=>


playerCommandService
.repeat(

agent.id,

"ALL"

)

}

>

Repeat All

</button>



</div>

);


}