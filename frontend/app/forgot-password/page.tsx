"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Email, 2: Code

    const router = useRouter();

    async function handleEmailSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.post("/auth/forgot-password", { email });
            if (res.data.success) {
                setStep(2);
            } else {
                toast.error(res.data.error || "Failed to send reset code");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send reset code");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleVerifyCode(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await api.post("/auth/reset-password/verify", { email, code });
            if (res.data.success) {
                router.push(`/reset-password/${res.data.resetToken}`);
            } else {
                toast.error(res.data.error || "Invalid verification code");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Invalid verification code");
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
                    <h2 className="text-xl font-semibold text-gray-200 mt-4">
                        {step === 1 ? "Reset your password" : "Verify your email"}
                    </h2>
                    <p className="text-gray-400 mt-2">
                        {step === 1
                            ? "Enter your email and we'll send you a recovery code"
                            : `Enter the 6-digit code we sent to ${email}`}
                    </p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-xl">
                    {step === 1 ? (
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
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
                                {isLoading ? "Sending..." : "Send Reset Code"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-300">Verification Code</label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="123456"
                                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || code.length !== 6}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95"
                            >
                                {isLoading ? "Verifying..." : "Verify Code"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Change Email
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center">
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
