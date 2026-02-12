import { io } from "socket.io-client";

export function createSocket() {
  return io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
    withCredentials: true,
    autoConnect: false,
    transports: ["polling", "websocket"], // Polling first is better for cookies
  });
}
