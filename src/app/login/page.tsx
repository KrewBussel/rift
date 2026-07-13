"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import { buildFirmUrl, isHostUnderConfiguredRoot } from "@/lib/firmDomain";
import { T, HEADLINE_STACK } from "@/components/tokens";

/**
 * Only ever return to a same-origin path. A `callbackUrl` query param that
 * points at another origin (or is malformed) falls back to /dashboard so the
 * login page can't be used as an open redirect.
 */
function safeCallbackPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("callbackUrl");
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    if (url.origin === window.location.origin) return url.pathname + url.search;
  } catch {
    /* not a URL — ignore */
  }
  return null;
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // After credentials sign-in succeeds, fetch the freshly-issued session to
    // read the user's firm slug and redirect to <slug>.riftira.com/dashboard.
    // Full-page navigation (not router.push) is required so the browser sees
    // the new origin and the .riftira.com session cookie is sent.
    const session = await getSession();
    const slug = session?.user?.firmSlug;
    const destination = safeCallbackPath() ?? "/dashboard";

    // If we're on a host that isn't under the configured root (localhost dev,
    // a Vercel preview URL, etc.), `<slug>.<root>` may not resolve to this
    // deployment — navigate on the current origin and let the proxy render
    // the tenant-scoped page in place.
    const onConfiguredRoot =
      typeof window !== "undefined" &&
      isHostUnderConfiguredRoot(window.location.host);

    if (!slug || !onConfiguredRoot) {
      window.location.assign(destination);
      return;
    }

    window.location.assign(buildFirmUrl(slug, destination));
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: T.page, color: T.text }}
    >
      <div className="w-full max-w-[400px]">
        {/* Brand lockup */}
        <Link href="/" className="flex flex-col items-center mb-8">
          <LogoMark id="login-logo" size={40} />
          <h1
            className="mt-4"
            style={{
              fontFamily: HEADLINE_STACK,
              fontSize: 26,
              fontWeight: 600,
              color: T.text,
              letterSpacing: -0.4,
            }}
          >
            Welcome back
          </h1>
          <p className="text-sm mt-1.5" style={{ color: T.textSecondary }}>
            Sign in to your Rift account
          </p>
        </Link>

        {/* Card */}
        <div
          className="rounded-xl p-7"
          style={{
            background: T.surface1,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 2px rgba(31,30,26,0.04), 0 8px 24px rgba(31,30,26,0.05)",
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
              autoFocus
              required
            />

            <Field
              id="password"
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              onKeyEvent={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="flex items-center justify-center"
                  style={{ color: T.textTertiary, width: 28, height: 28 }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
              labelExtra={
                <Link
                  href="/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: T.accent }}
                >
                  Forgot?
                </Link>
              }
            />

            {capsLock && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: T.warningSoft, border: `1px solid ${T.warningBorder}` }}
              >
                <span className="text-xs" style={{ color: T.warning }}>
                  Caps Lock is on.
                </span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg px-3 py-2.5"
                style={{ background: T.dangerSoft, border: `1px solid ${T.dangerBorder}` }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: T.danger }}
                >
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p className="text-xs leading-relaxed" style={{ color: T.danger }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
              style={{
                background: loading ? T.accentHover : T.accent,
                color: "#fff",
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading && <Spinner />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: T.textTertiary }}>
          Access restricted to authorized firm members.{" "}
          <Link href="/" className="hover:underline" style={{ color: T.textSecondary }}>
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
  autoFocus,
  labelExtra,
  trailing,
  onKeyEvent,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  labelExtra?: React.ReactNode;
  /** Rendered inside the input's right edge (e.g. show/hide toggle). */
  trailing?: React.ReactNode;
  /** Fired on key down/up — used for Caps Lock detection. */
  onKeyEvent?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="block text-[11px] font-medium uppercase tracking-widest"
          style={{ color: T.textTertiary }}
        >
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onKeyDown={onKeyEvent}
          onKeyUp={onKeyEvent}
          className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-0 transition-colors"
          style={{
            background: T.input,
            border: `1px solid ${T.border}`,
            color: T.text,
            caretColor: T.accent,
            paddingRight: trailing ? 38 : undefined,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = T.borderFocus)}
          onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M1.5 7.5S3.75 3.25 7.5 3.25 13.5 7.5 13.5 7.5s-2.25 4.25-6 4.25S1.5 7.5 1.5 7.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M2 2l11 11M6 5.9A5.9 5.9 0 0 1 7.5 5.75c3.75 0 6 3.75 6 3.75a10.9 10.9 0 0 1-1.9 2.3M9.3 9.3a1.75 1.75 0 1 1-2.47-2.47M4.2 4.9C2.4 6 1.5 7.5 1.5 7.5s2.25 4.25 6 4.25c.6 0 1.16-.1 1.68-.26"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
