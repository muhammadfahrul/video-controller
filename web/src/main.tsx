import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import "./index.css";


import {
    socketService
} from "./services/socket";


import {
    PlayerStateListener
} from "./services/player";

import {
    registerPlaylistListener
} from "./services/socket";

// Register socket listeners before connecting
registerPlaylistListener();

// Start player state listener
const playerStateListener = new PlayerStateListener();
playerStateListener.start();



// Start Socket Connection

socketService.connect();



// Service worker registration for the production PWA is handled by
// vite-plugin-pwa's auto-injected registerSW.js (see vite.config.ts).



ReactDOM.createRoot(
    document.getElementById("root")!
).render(

    <React.StrictMode>

        <BrowserRouter>

            <App />

        </BrowserRouter>

    </React.StrictMode>

);