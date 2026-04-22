"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
    } else if (res.status === 429) {
      setError("Too many attempts. Please wait a few minutes and try again.");
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0d1117" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-xl font-black tracking-tight" style={{ color: "#e4e6ea", letterSpacing: "-0.02em" }}>
            Rift
          </h1>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: "#161b22", border: "1px solid #30363d", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}
        >
          {submitted ? (
            <>
              <h2 className="text-[15px] font-semibold mb-3" style={{ color: "#e4e6ea" }}>
                Check your email
              </h2>
              <p className="text-sm mb-6" style={{ color: "#7d8590" }}>
                If an account exists for <span style={{ color: "#c9d1d9" }}>{email}</span>, we&apos;ve sent a password reset link. The link expires in 30 minutes.
              </p>
              <Link
                href="/login"
                className="inline-block text-xs hover:underline"
                style={{ color: "#58a6ff" }}
              >
                ← Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-[15px] font-semibold mb-2" style={{ color: "#e4e6ea" }}>
                Reset your password
              </h2>
              <p className="text-sm mb-6" style={{ color: "#7d8590" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "#7d8590" }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@firm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-0 transition-colors"
                    style={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", caretColor: "#58a6ff" }}
                  />
                </div>

                {error && (
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "#2d1f1f", border: "1px solid #5c2626" }}>
                    <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  style={{ background: loading ? "#1d4ed8" : "#2563eb" }}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                <Link href="/login" className="block text-center text-xs hover:underline mt-3" style={{ color: "#58a6ff" }}>
                  ← Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
