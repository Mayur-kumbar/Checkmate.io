"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const res = await fetch("http://localhost:4000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    localStorage.setItem("token", data.token);
    window.location.href = "/lobby";
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="space-y-4">
        <input onChange={e => setUsername(e.target.value)} placeholder="username" />
        <input type="password" onChange={e => setPassword(e.target.value)} placeholder="password" />
        <button onClick={login}>Login</button>
      </div>
    </div>
  );
}
