"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { debounce } from "lodash";

type SignupStep = 1 | 2 | 3;

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [completeToken, setCompleteToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const checkUsername = useCallback(
    debounce(async (val: string) => {
      if (!val) {
        setUsernameStatus("idle");
        return;
      }
      const regex = /^[a-zA-Z0-9]+$/;
      if (!regex.test(val)) {
        setUsernameStatus("invalid");
        return;
      }
      setUsernameStatus("checking");
      try {
        const res = await api.get(`/auth/check-username?username=${val}`);
        if (res.data.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (step === 3) {
      checkUsername(username);
    }
  }, [username, step, checkUsername]);

  // Phase 1: Email Init
  async function handleInit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("/auth/signup/init", { email });
      if (res.data.success) {
        setStep(2);
      } else {
        toast.error(res.data.error || "Failed to send verification code");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Signup initialization failed");
    } finally {
      setIsLoading(false);
    }
  }

  // Phase 2: Code Verification
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("/auth/signup/verify", { email, code });
      if (res.data.success) {
        setCompleteToken(res.data.completeToken);
        setStep(3);
      } else {
        toast.error(res.data.error || "Invalid code");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  }

  // Phase 3: Profile Completion
  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/signup/complete", {
        completeToken,
        username,
        password
      });
      if (res.data.success) {
        router.push("/lobby");
      } else {
        toast.error(res.data.error || "Signup completion failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Signup completion failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 transition-all duration-500">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity">
            <div className="text-3xl md:text-4xl text-blue-400">♔</div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Checkmate.io
            </h1>
          </Link>
          <p className="text-gray-400 mt-2 font-medium">Join the grandmasters of tomorrow</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-between mb-8 px-2 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -translate-y-1/2 z-0 rounded-full"></div>
          <div
            className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full z-10 flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${step >= s
                ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "bg-gray-800 border-gray-600 text-gray-500"
                }`}
            >
              {s}
            </div>
          ))}
        </div>

        <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300">

          {step === 1 && (
            <form onSubmit={handleInit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white">Start With Your Email</h2>
                <p className="text-gray-400 text-sm">We'll send you a verification code</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Continue"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white">Check Your Inbox</h2>
                <p className="text-gray-400 text-sm">Sent to <b>{email}</b></p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white text-center text-2xl tracking-[1em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                Change Email
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleComplete} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
                <p className="text-gray-400 text-sm">Almost there! Set your credentials</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-gray-300">Username</label>
                  {username && (
                    <span className={`text-xs font-bold transition-all ${usernameStatus === "available" ? "text-green-400" :
                      usernameStatus === "taken" ? "text-red-400" :
                        usernameStatus === "invalid" ? "text-yellow-400" :
                          usernameStatus === "checking" ? "text-blue-400 animate-pulse" :
                            "text-gray-500"
                      }`}>
                      {usernameStatus === "available" && "✓ Available"}
                      {usernameStatus === "taken" && "✕ Already taken"}
                      {usernameStatus === "invalid" && "⚠ Alphanumeric only"}
                      {usernameStatus === "checking" && "Checking..."}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className={`w-full px-4 py-3 bg-gray-900/50 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all duration-200 ${usernameStatus === "available" ? "border-green-500/50 focus:ring-green-500" :
                    usernameStatus === "taken" ? "border-red-500/50 focus:ring-red-500" :
                      "border-gray-600 focus:ring-blue-500"
                    }`}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Create Account"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
            <p className="text-gray-400 text-sm">
              Already a member?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}