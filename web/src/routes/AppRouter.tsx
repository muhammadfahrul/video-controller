import {

    Routes,
    Route

} from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import HomePage from "../pages/HomePage";
import PlaylistPage from "../pages/PlaylistPage";
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
                    path="/playlist"
                    element={<PlaylistPage />}
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