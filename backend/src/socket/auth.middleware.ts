import { redis } from "../utils/redis";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import * as cookie from "cookie";

export async function socketAuth(socket: any, next: any) {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    // Log for debugging
    // console.log('--- Socket Auth Handshake ---');
    // console.log('Origin:', socket.handshake.headers.origin);
    // console.log('Cookie Header:', cookieHeader ? "Present" : "Missing");

    let token = socket.handshake.auth?.token;

    if (!token && cookieHeader) {
      if (cookie && typeof cookie.parse === 'function') {
        const parsedCookies = cookie.parse(cookieHeader);
        token = parsedCookies.token;
      } else {
        console.error("Socket Auth Error: 'cookie.parse' is not a function. Check import.");
      }
    }

    if (!token) {
      console.error("Socket Auth Error: No token found.");
      return next(new Error("Unauthorized: No token"));
    }

    // Verify JWT
    try {
      const decoded: any = jwt.verify(token, ENV.JWT_SECRET);

      if (!decoded.sessionId) {
        console.error("Socket Auth Error: No sessionId in token");
        return next(new Error("Unauthorized: Invalid session"));
      }

      const userId = await redis.get(`session:${decoded.sessionId}`);
      if (!userId) {
        console.error(`Socket Auth Error: Session ${decoded.sessionId} not found`);
        return next(new Error("Unauthorized: Expired session"));
      }

      socket.data.userId = userId;
      socket.data.sessionId = decoded.sessionId;
      console.log(`Socket Auth Success: User ${userId}`);
      next();
    } catch (jwtErr: any) {
      console.error("Socket Auth Error: JWT failed", jwtErr.message);
      return next(new Error("Unauthorized: JWT invalid"));
    }

  } catch (err: any) {
    console.error("Socket Auth Critical Error:", err);
    next(new Error("Internal Server Error"));
  }
}
