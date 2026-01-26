// src/socket/auth.middleware.ts
import { verifyToken } from "../utils/jwt";

export function socketAuth(socket: any, next: any) {
  const token = socket.handshake.auth?.token;

  if (!token) return next(new Error("Unauthorized"));

  try {
    const payload = verifyToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
}
