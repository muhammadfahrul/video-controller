import AppRouter from "./routes/AppRouter";
import AgentOfflineOverlay from "./shared/components/AgentOfflineOverlay";
import { LoadingProvider } from "./context/LoadingContext";

export default function App() {

    return (

        <LoadingProvider>
            <AppRouter />
            <AgentOfflineOverlay />
        </LoadingProvider>

    );

}