import { io, Socket } from "socket.io-client";

export function createSocket(): Socket {
  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL && process.env.NEXT_PUBLIC_SOCKET_URL !== ""
      ? process.env.NEXT_PUBLIC_SOCKET_URL
      : undefined; // same-origin when undefined

  return io(socketUrl, {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: false,
    transports: ["polling", "websocket"], // polling first helps with cookies
  });
}