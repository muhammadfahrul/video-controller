"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const socket = (0, socket_io_client_1.io)(`http://localhost:${process.env.PORT || 3000}`);
socket.on("connect", () => {
    console.log("connected", socket.id);
    socket.emit("agent:register", {
        id: "windows-01",
        name: "PC Ruang Tamu"
    });
});
