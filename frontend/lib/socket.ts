import { io } from "socket.io-client";

export function createSocket() {
  const token = localStorage.getItem("token");

  return io("http://localhost:4000", {
    auth: {
      token,
    },
    autoConnect: false,
  });
}
