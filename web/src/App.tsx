import AppRouter from "./routes/AppRouter";
import AgentOfflineOverlay from "./shared/components/AgentOfflineOverlay";

export default function App() {

    return (

        <>
            <AppRouter />
            <AgentOfflineOverlay />
        </>

    );

}