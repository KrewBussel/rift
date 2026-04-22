"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoMark from "@/components/LogoMark";

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
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#0a0d12", color: "#c9d1d9" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Brand lockup */}
        <Link href="/" className="flex flex-col items-center mb-8">
          <LogoMark id="login-logo" size={40} />
          <h1
            className="font-[family-name:var(--font-inter-tight)] text-xl font-semibold tracking-tight mt-4"
            style={{ color: "#e4e6ea", letterSpacing: "-0.02em" }}
          >
            Welcome back
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#7d8590" }}>
            Sign in to your Rift account
          </p>
        </Link>

        {/* Card */}
        <div
          className="rounded-xl p-7"
          style={{
            background: "#0f131b",
            border: "1px solid #1e2330",
          }}
        >

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="email"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@firm.com"
              required
            />

            <Field
              id="password"
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              labelExtra={
                <Link
                  href="/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: "#60a5fa" }}
                >
                  Forgot?
                </Link>
              }
            />

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                style={{ background: "#1f1515", border: "1px solid #4a1f1f" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: "#f87171" }}
                >
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: "#fca5a5" }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: loading ? "#1d4ed8" : "#2563eb" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "#484f58" }}>
          Access restricted to authorized firm members.{" "}
          <Link href="/" className="hover:underline" style={{ color: "#7d8590" }}>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  type,
  autoComplete,
  placeholder,
  required,
  labelExtra,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  labelExtra?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="block text-[11px] font-medium uppercase tracking-widest"
          style={{ color: "#7d8590" }}
        >
          {label}
        </label>
        {labelExtra}
      </div>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-0 focus:border-[#3b82f680] transition-colors"
        style={{
          background: "#0a0d12",
          border: "1px solid #1e2330",
          color: "#e4e6ea",
          caretColor: "#60a5fa",
        }}
      />
    </div>
  );
}

