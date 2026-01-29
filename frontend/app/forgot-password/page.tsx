"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.post("/auth/forgot-password", { email });
            if (res.data.success) {
                setIsSent(true);
            } else {
                alert(res.data.error || "Failed to send reset link");
            }
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to send reset link");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-2">
                        <div className="text-4xl text-blue-400">♔</div>
                        <h1 className="text-3xl font-bold text-white">Checkmate.io</h1>
                    </Link>
                    <h2 className="text-xl font-semibold text-gray-200 mt-4">Reset your password</h2>
                    <p className="text-gray-400 mt-2">Enter your email and we'll send you a recovery link</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-xl">
                    {isSent ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white">Check your email</h3>
                            <p className="text-gray-400">If an account exists for {email}, you will receive a reset link shortly.</p>
                            <Link
                                href="/login"
                                className="inline-block w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition-all"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-300">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95"
                            >
                                {isLoading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>
                    )}

                    {!isSent && (
                        <div className="mt-8 text-center">
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
                                Wait, I remember my password!
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
