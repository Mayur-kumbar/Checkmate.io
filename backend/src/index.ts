import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { ENV } from "./config/env";
import { initSockets } from "./socket/game.socket";
import { connectDB } from "./db/index";
import { redis } from "./utils/redis";
import authRoutes from "./routes/auth.routes";
import { socketAuth } from "./socket/auth.middleware";

const app = express();
app.use(cors());
app.use(express.json());

try {
    connectDB();
    redis.on("error", (err) => {
        console.error("Redis connection error:", err);
    });

} catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
}

app.use("/auth", authRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.use(socketAuth);
initSockets(io);

server.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
