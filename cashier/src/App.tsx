import { Routes, Route } from "react-router-dom";
import CashierLayout from "./layouts/CashierLayout";
import DashboardPage from "./pages/DashboardPage";
import { RoomConfigProvider } from "./context/RoomConfigContext";
import { LoadingProvider } from "./context/LoadingContext";

export default function App() {
  return (
    <RoomConfigProvider>
      <LoadingProvider>
        <Routes>
          <Route element={<CashierLayout />}>
            <Route path="/" element={<DashboardPage />} />
          </Route>
        </Routes>
      </LoadingProvider>
    </RoomConfigProvider>
  );
}
