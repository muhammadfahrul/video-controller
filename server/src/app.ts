import express from "express";
import cors from "cors";

export function createApp() {

    const app = express();

    app.use(cors());

    app.use(express.json());

    return app;

}