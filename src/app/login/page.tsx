"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0d1117" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="mb-4"
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#0e0b08",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(234,195,120,0.25), 0 0 22px rgba(234,195,120,0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <defs>
                <linearGradient id="rift-login-seam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f9eac8" />
                  <stop offset="0.55" stopColor="#e9d4a3" />
                  <stop offset="1" stopColor="#c19a5b" />
                </linearGradient>
              </defs>
              <path
                d="M10 4 L14 13 L17 15 L21 24"
                stroke="#c19a5b"
                strokeOpacity="0.32"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 4 L14 13 L17 15 L21 24"
                stroke="url(#rift-login-seam)"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: "#e4e6ea", letterSpacing: "-0.02em" }}
          >
            Rift
          </h1>
          <p className="text-sm mt-1" style={{ color: "#7d8590" }}>
            Rollover case management
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          }}
        >
          <h2
            className="text-[15px] font-semibold mb-6"
            style={{ color: "#e4e6ea" }}
          >
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                style={{ color: "#7d8590" }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@firm.com"
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                style={{
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  color: "#c9d1d9",
                  caretColor: "#58a6ff",
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wide"
                  style={{ color: "#7d8590" }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: "#58a6ff" }}
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                style={{
                  background: "#0d1117",
                  border: "1px solid #30363d",
                  color: "#c9d1d9",
                  caretColor: "#58a6ff",
                }}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ background: "#2d1f1f", border: "1px solid #5c2626" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="flex-shrink-0"
                  style={{ color: "#f87171" }}
                >
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: loading ? "#1d4ed8" : "#2563eb" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "#484f58" }}>
          Access restricted to authorized firm members only.
        </p>
      </div>
    </div>
  );
}
