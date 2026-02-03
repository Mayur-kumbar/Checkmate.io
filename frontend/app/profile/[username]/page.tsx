"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Trophy, Swords, Medal, History } from "lucide-react";

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);
    const [profile, setProfile] = useState<any>(null);
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 1 });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profileRes = await api.get(`/user/profile/${username}`);
                if (profileRes.data.success) {
                    setProfile(profileRes.data.user);
                    fetchGames(profileRes.data.user._id, 1);
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [username]);

    const fetchGames = async (userId: string, page: number) => {
        try {
            const gamesRes = await api.get(`/user/${userId}/games?page=${page}&limit=10`);
            if (gamesRes.data.success) {
                setGames(gamesRes.data.games);
                setPagination(gamesRes.data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch games:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center space-y-4">
                <h1 className="text-4xl font-bold text-red-500">User Not Found</h1>
                <Link href="/lobby" className="text-blue-400 hover:underline">Return to Lobby</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white">
            {/* Header */}
            <div className="border-b border-gray-800 bg-gray-900/30 backdrop-blur-md sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/lobby" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-xl font-bold">Profile</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-3xl p-8 md:p-12 mb-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                        <Trophy size={160} />
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
                        <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-5xl font-bold shadow-xl shadow-blue-500/20">
                            {profile.username[0].toUpperCase()}
                        </div>
                        <div className="text-center md:text-left space-y-2">
                            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                {profile.username}
                            </h2>
                            <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2">
                                <History size={16} /> Joined {new Date(profile.createdAt).toLocaleDateString()}
                            </p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                                <div className="bg-gray-800/80 px-6 py-3 rounded-2xl border border-blue-500/20 text-center min-w-[100px]">
                                    <p className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-1">Wins</p>
                                    <p className="text-2xl font-black">{profile.wins || 0}</p>
                                </div>
                                <div className="bg-gray-800/80 px-6 py-3 rounded-2xl border border-purple-500/20 text-center min-w-[100px]">
                                    <p className="text-xs text-purple-400 uppercase font-bold tracking-wider mb-1">Draws</p>
                                    <p className="text-2xl font-black">{profile.draws || 0}</p>
                                </div>
                                <div className="bg-gray-800/80 px-6 py-3 rounded-2xl border border-pink-500/20 text-center min-w-[100px]">
                                    <p className="text-xs text-pink-400 uppercase font-bold tracking-wider mb-1">Losses</p>
                                    <p className="text-2xl font-black">{profile.losses || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Game History */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Swords className="text-blue-500" />
                        <h3 className="text-2xl font-bold">Game History</h3>
                    </div>

                    <div className="grid gap-4">
                        {games.length === 0 ? (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
                                No games played yet.
                            </div>
                        ) : (
                            games.map((game: any) => {
                                const isWhite = game.white === profile._id;
                                const opponentId = isWhite ? game.black : game.white;
                                const resultStr = game.result === "1/2-1/2" ? "Draw" :
                                    (game.result === (isWhite ? "1-0" : "0-1") ? "Won" : "Lost");

                                return (
                                    <div key={game._id} className="bg-gray-900/40 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all group flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${resultStr === "Won" ? "bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]" :
                                                    resultStr === "Lost" ? "bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]" :
                                                        "bg-gray-500/10 text-gray-400"
                                                }`}>
                                                {resultStr === "Won" ? "W" : resultStr === "Lost" ? "L" : "D"}
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-sm mb-1">{new Date(game.createdAt).toLocaleString()}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg">{isWhite ? "White" : "Black"}</span>
                                                    <span className="text-gray-600">vs</span>
                                                    <span className="text-gray-300 font-medium">{opponentId.substring(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 text-right">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Medal size={14} className="text-yellow-500" />
                                                <span>{game.reason}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 font-mono tracking-tighter">ID: {game.gameId}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-8">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => fetchGames(profile._id, pagination.page - 1)}
                                className="px-6 py-2 rounded-xl border border-gray-700 disabled:opacity-30 hover:bg-gray-800 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-gray-400">Page {pagination.page} of {pagination.pages}</span>
                            <button
                                disabled={pagination.page === pagination.pages}
                                onClick={() => fetchGames(profile._id, pagination.page + 1)}
                                className="px-6 py-2 rounded-xl border border-gray-700 disabled:opacity-30 hover:bg-gray-800 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Decorative Blur */}
            <div className="fixed top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        </div>
    );
}
