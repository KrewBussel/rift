"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit = token && newPassword.length >= 12 && passwordsMatch;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
    }
  }

  if (!token) {
    return (
      <>
        <h2 className="text-[15px] font-semibold mb-2" style={{ color: "#e4e6ea" }}>
          Invalid reset link
        </h2>
        <p className="text-sm mb-6" style={{ color: "#7d8590" }}>
          This reset link is missing or malformed. Request a new one to continue.
        </p>
        <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: "#58a6ff" }}>
          Request a new reset link →
        </Link>
      </>
    );
  }

  if (success) {
    return (
      <>
        <h2 className="text-[15px] font-semibold mb-2" style={{ color: "#e4e6ea" }}>
          Password reset
        </h2>
        <p className="text-sm" style={{ color: "#7d8590" }}>
          Your password has been updated. Redirecting you to sign in…
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-[15px] font-semibold mb-2" style={{ color: "#e4e6ea" }}>
        Choose a new password
      </h2>
      <p className="text-sm mb-6" style={{ color: "#7d8590" }}>
        At least 12 characters, with a number and a symbol.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "#7d8590" }}>
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            style={{
              background: "#0d1117",
              border: newPassword && newPassword.length < 12 ? "1px solid #5c2626" : "1px solid #30363d",
              color: "#c9d1d9",
              caretColor: "#58a6ff",
            }}
          />
          {newPassword && newPassword.length < 12 && (
            <p className="text-xs mt-1" style={{ color: "#f87171" }}>Must be at least 12 characters.</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: "#7d8590" }}>
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            style={{
              background: "#0d1117",
              border: confirmPassword && !passwordsMatch ? "1px solid #5c2626" : "1px solid #30363d",
              color: "#c9d1d9",
              caretColor: "#58a6ff",
            }}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs mt-1" style={{ color: "#f87171" }}>Passwords do not match.</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg px-3 py-2.5" style={{ background: "#2d1f1f", border: "1px solid #5c2626" }}>
            <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          style={{ background: loading ? "#1d4ed8" : "#2563eb" }}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<p className="text-sm" style={{ color: "#7d8590" }}>Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
