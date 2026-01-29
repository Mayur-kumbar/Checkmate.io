import { io } from "socket.io-client";

export function createSocket() {
  return io("http://localhost:4000", {
    withCredentials: true,
    autoConnect: false,
    transports: ["polling", "websocket"], // Polling first is better for cookies
  });
}
