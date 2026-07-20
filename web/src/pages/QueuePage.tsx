import QueuePanel from "../features/queue/components/QueuePanel";
import { useQueue } from "../hooks/useQueue";

export default function QueuePage() {

    // Initialize queue listener to receive queue state updates
    useQueue();

    return (

        <div className="space-y-4 landscape:space-y-5">

            <QueuePanel />

        </div>

    );

}