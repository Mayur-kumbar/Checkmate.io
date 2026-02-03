"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function UserSearch() {
    const [username, setUsername] = useState("");
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            router.push(`/profile/${username.trim()}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <input
                type="text"
                placeholder="Search users..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={20} />
            </div>
            <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
                Search
            </button>
        </form>
    );
}
