"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight">
              Master the Game of
              <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Kings
              </span>
            </h2>
            <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto px-4 sm:px-0">
              Play chess online with players around the world. Improve your skills, compete in tournaments, and climb the ranks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 px-8 sm:px-0">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-lg font-semibold shadow-xl shadow-purple-500/30 text-center"
            >
              Start Playing Now
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 text-lg font-semibold text-center"
            >
              I Have an Account
            </Link>
          </div>

          {/* Chess Board Preview */}
          <div className="pt-12 md:pt-16 flex justify-center overflow-hidden">
            <div className="inline-grid grid-cols-8 gap-0 border-2 md:border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl scale-90 sm:scale-100 origin-center">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isLight = (row + col) % 2 === 0;
                return (
                  <div
                    key={i}
                    className={`w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 ${isLight ? "bg-gray-300" : "bg-gray-700"
                      }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 md:p-8 hover:border-gray-600 transition-all duration-200">
            <div className="text-3xl md:text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold mb-2">Live Matches</h3>
            <p className="text-gray-400 text-sm md:text-base">
              Challenge players in real-time matches with instant matchmaking
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 md:p-8 hover:border-gray-600 transition-all duration-200">
            <div className="text-3xl md:text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Track Progress</h3>
            <p className="text-gray-400 text-sm md:text-base">
              Monitor your rating, analyze games, and watch yourself improve
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 md:p-8 hover:border-gray-600 transition-all duration-200">
            <div className="text-3xl md:text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Tournaments</h3>
            <p className="text-gray-400 text-sm md:text-base">
              Compete in tournaments and climb the global leaderboards
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm mt-12 md:mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400 text-sm md:text-base">
          <p>&copy; 2026 Checkmate.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}