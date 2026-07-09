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
    registerQueueListener
} from "./services/socket";

registerQueueListener();



// Start Socket Connection

socketService.connect();



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