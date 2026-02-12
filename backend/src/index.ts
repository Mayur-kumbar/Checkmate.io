import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { ENV } from "./config/env";
import { initSockets } from "./socket/game.socket";
import { connectDB } from "./db/index";
import { redis } from "./utils/redis";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import gameRoutes from "./routes/game.routes";
import { socketAuth } from "./socket/auth.middleware";
import cookieParser from "cookie-parser";

const app = express();
app.use(cors(
  {
    origin: ENV.CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  }
));
app.use(express.json());
app.use(cookieParser());

try {
  connectDB();
  redis.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

} catch (error) {
  console.error("Failed to connect to database:", error);
  process.exit(1);
}

app.get("/health", (req, res) => {
  res.json({ message: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/game", gameRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  }
});

io.use(socketAuth);
initSockets(io);

server.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
