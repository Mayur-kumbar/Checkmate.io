"use client";

import { useEffect, useRef, useState } from "react";
import { createSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

import UserSearch from "@/components/UserSearch";
import Header from "@/components/Header";

export default function LobbyPage() {
  const socketRef = useRef<any>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    // Fetch user profile on mount
    const initLobby = async () => {
      try {
        const res = await api.get("/auth/me");
        if (res.data.success) {
          setUser(res.data.user);
          // Only connect socket AFTER we are sure we have a valid session/cookie
          socket.connect();
        } else {
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      }
    };

    initLobby();

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    // ... rest of socket event handlers
    socket.on("waiting_for_opponent", () => {
      setIsWaiting(true);
    });

    socket.on("game_start", (game: any) => {
      router.push(`/game/${game.gameId}`);
    });

    socket.on("already_in_game", (data: any) => {
      router.push(`/game/${data.gameId}`);
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket auth error:", err.message);
    });

    return () => {
      setIsWaiting(false);
      socket.disconnect();
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Header user={user} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Search Section */}
          <div className="flex justify-center mb-10 md:mb-12">
            <UserSearch />
          </div>

          {/* Welcome Section */}
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 px-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent break-words">
                {user?.username}
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 px-4">
              {isWaiting ? "Finding you a worthy opponent..." : "Ready to play? Find a match below!"}
            </p>
          </div>

          {/* Main Game Finder Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 md:p-12 shadow-2xl mb-8 mx-2 sm:mx-0">
            {isWaiting && (
              <div className="mb-6 md:mb-8 flex flex-col items-center">
                <div className="relative w-24 h-24 md:w-32 md:h-32 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-purple-500 border-b-transparent border-l-transparent animate-spin"></div>
                  <div className="absolute inset-3 md:inset-4 rounded-full border-4 border-purple-500/20"></div>
                  <div className="absolute inset-3 md:inset-4 rounded-full border-4 border-t-transparent border-r-transparent border-b-purple-500 border-l-blue-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
                  <div className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl">♔</div>
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="text-xl md:text-2xl font-semibold text-blue-400">Searching for opponent...</h3>
                  <p className="text-gray-400 text-sm md:text-base">This won't take long</p>
                  <div className="flex justify-center gap-1 pt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <button
                disabled={isWaiting}
                onClick={() => socketRef.current?.emit("find_game")}
                className={`w-full max-w-md px-6 py-4 md:px-8 md:py-6 rounded-xl font-bold text-lg md:text-xl transition-all duration-300 transform ${isWaiting ? "bg-gray-700 cursor-not-allowed opacity-50" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"}`}>
                {isWaiting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">⚔️ Find Game</span>
                )}
              </button>
              {isWaiting && (
                <button
                  onClick={() => { setIsWaiting(false); socketRef.current?.emit("cancel_find"); }}
                  className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm underline py-2"
                >
                  Cancel search
                </button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 px-2 sm:px-0">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6 text-center hover:border-gray-600 transition-all duration-200">
              <div className="text-2xl md:text-3xl mb-2">🏆</div>
              <div className="text-xl md:text-2xl font-bold text-blue-400 mb-1">{user?.wins || 0}</div>
              <div className="text-xs md:text-sm text-gray-400 uppercase tracking-wider">Wins</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6 text-center hover:border-gray-600 transition-all duration-200">
              <div className="text-2xl md:text-3xl mb-2">🤝</div>
              <div className="text-xl md:text-2xl font-bold text-purple-400 mb-1">{user?.draws || 0}</div>
              <div className="text-xs md:text-sm text-gray-400 uppercase tracking-wider">Draws</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-4 md:p-6 text-center hover:border-gray-600 transition-all duration-200">
              <div className="text-2xl md:text-3xl mb-2">❌</div>
              <div className="text-xl md:text-2xl font-bold text-pink-400 mb-1">{user?.losses || 0}</div>
              <div className="text-xs md:text-sm text-gray-400 uppercase tracking-wider">Losses</div>
            </div>
          </div>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
