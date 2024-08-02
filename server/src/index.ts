import express from "express";
import { createServer } from "http";

import authRoutes from "../src/routes/authRoute";
import { Server } from "socket.io";
import { corsMiddleware } from "./middlware/corsMiddleware";
import { setupSocket } from "./lib/socket";


const app = express();
const port = process.env.PORT || 8000;
const httpServer = createServer(app);

app.use(express.json());
app.use(corsMiddleware);

app.use("/api/auth", authRoutes);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocket(io);

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
