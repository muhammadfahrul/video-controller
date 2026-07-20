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
const playerListener = new PlayerStateListener();
playerListener.start();



// Start Socket Connection

socketService.connect();



// Register Service Worker for PWA

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app still works
    });
  });
}



// Start Player State Listener

const playerStateListener =
    new PlayerStateListener();


playerStateListener.start();



ReactDOM.createRoot(
    document.getElementById("root")!
).render(

    <React.StrictMode>

        <BrowserRouter>

            <App />

        </BrowserRouter>

    </React.StrictMode>

);