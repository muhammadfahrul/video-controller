import { Routes, Route } from "react-router-dom";
import CashierLayout from "./layouts/CashierLayout";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <div style={{ width: '100vw', maxWidth: '100vw', overflowX: 'hidden', margin: 0, padding: 0 }}>
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
    </div>
  );
}
