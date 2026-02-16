"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface HeaderProps {
    user?: { username: string } | null;
    leftActions?: React.ReactNode;
    rightActions?: React.ReactNode;
    isGamePage?: boolean;
}

export default function Header({ user, leftActions, rightActions, isGamePage }: HeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
            router.push("/");
        } catch (error) {
            console.error("Logout failed:", error);
            router.push("/");
        }
    };

    return (
        <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    {leftActions}
                    <Link href={user ? "/lobby" : "/"} className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                        <div className="text-2xl md:text-3xl">♔</div>
                        <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate">
                            Checkmate.io
                        </h1>
                    </Link>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {rightActions}

                    {!isGamePage && (
                        <>
                            {user ? (
                                <div className="flex items-center gap-2 md:gap-4">
                                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm text-gray-300 font-medium truncate max-w-[100px]">{user.username}</span>
                                    </div>
                                    <Link
                                        href={`/profile/${user.username}`}
                                        className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all text-xs md:text-sm font-medium"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm font-medium"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 md:gap-4">
                                    <Link
                                        href="/login"
                                        className="px-4 py-1.5 md:px-6 md:py-2 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 text-xs md:text-sm font-medium"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="px-4 py-1.5 md:px-6 md:py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-purple-500/20 text-xs md:text-sm font-bold text-white whitespace-nowrap"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
