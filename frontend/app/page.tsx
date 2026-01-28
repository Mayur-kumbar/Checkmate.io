"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-3xl">♔</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Checkmate.io
            </h1>
          </div>
          <nav className="flex gap-4">
            <Link
              href="/login"
              className="px-6 py-2 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-purple-500/20"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-bold leading-tight">
              Master the Game of
              <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Kings
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
              Play chess online with players around the world. Improve your skills, compete in tournaments, and climb the ranks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-lg font-semibold shadow-xl shadow-purple-500/30"
            >
              Start Playing Now
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 text-lg font-semibold"
            >
              I Have an Account
            </Link>
          </div>

          {/* Chess Board Preview */}
          <div className="pt-16 flex justify-center">
            <div className="inline-grid grid-cols-8 gap-0 border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isLight = (row + col) % 2 === 0;
                return (
                  <div
                    key={i}
                    className={`w-12 h-12 md:w-16 md:h-16 ${
                      isLight ? "bg-gray-300" : "bg-gray-700"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-gray-600 transition-all duration-200">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold mb-2">Live Matches</h3>
            <p className="text-gray-400">
              Challenge players in real-time matches with instant matchmaking
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-gray-600 transition-all duration-200">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Track Progress</h3>
            <p className="text-gray-400">
              Monitor your rating, analyze games, and watch yourself improve
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:border-gray-600 transition-all duration-200">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-bold mb-2">Tournaments</h3>
            <p className="text-gray-400">
              Compete in tournaments and climb the global leaderboards
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>&copy; 2024 ChessMaster. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}