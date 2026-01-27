"use client";

import { useEffect, useRef } from "react";
import { createSocket } from "@/lib/socket";

export default function LobbyPage() {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.connect();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("waiting_for_opponent", () => {
      console.log("Waiting...");
    });

    socket.on("game_start", (game: any) => {
      window.location.href = `/game/${game.gameId}`;
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket auth error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={() => socketRef.current?.emit("find_game")}
      >
        Find Game
      </button>
    </div>
  );
}
