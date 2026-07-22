import { Routes, Route } from "react-router-dom";
import CashierLayout from "./layouts/CashierLayout";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <Routes>
      <Route
        element={<CashierLayout />}
      >
        <Route
          path="/"
          element={<DashboardPage />}
        />
      </Route>
    </Routes>
  );
}
