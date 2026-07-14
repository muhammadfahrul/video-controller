import {

    Routes,
    Route

} from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import HomePage from "../pages/HomePage";
import QueuePage from "../pages/QueuePage";
import SearchPage from "../pages/SearchPage";
import SettingsPage from "../pages/SettingsPage";

export default function AppRouter() {

    return (

        <Routes>

            <Route
                element={<MainLayout />}
            >

                <Route
                    path="/"
                    element={<HomePage />}
                />

                <Route
                    path="/queue"
                    element={<QueuePage />}
                />

                <Route
                    path="/search"
                    element={<SearchPage />}
                />

                <Route
                    path="/settings"
                    element={<SettingsPage />}
                />

            </Route>

        </Routes>

    );

}