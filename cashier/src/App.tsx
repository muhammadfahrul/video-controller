import { Routes, Route } from "react-router-dom";
import CashierLayout from "./layouts/CashierLayout";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<CashierLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
      </Route>
    </Routes>
  );
}
