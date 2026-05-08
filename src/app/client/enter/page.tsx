"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function EnterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing access token.");
      return;
    }
    fetch("/api/client/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          router.replace("/client");
          return;
        }
        const body = await res.json().catch(() => ({}));
        const reason = body?.reason as string | undefined;
        const messages: Record<string, string> = {
          invalid: "This link is invalid.",
          expired: "This link has expired. Ask your advisor for a new one.",
          revoked: "This link has been revoked. Ask your advisor for a new one.",
          consumed: "This link has already been used. Ask your advisor for a new one.",
        };
        setError(messages[reason ?? ""] ?? body?.error ?? "Unable to open your case.");
      })
      .catch(() => setError("Network error. Please try again."));
  }, [params, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 1000px 500px at top, rgba(59,130,246,0.08), transparent 60%), #0a0d12",
      }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{ background: "#141a24", border: "1px solid #252b38" }}
      >
        {error ? (
          <>
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#fca5a5" }}>
                <path
                  d="M10 6v4M10 13.5v.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>
              Couldn&apos;t open your case
            </h1>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              {error}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="animate-spin" style={{ color: "#60a5fa" }}>
                <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="30 18" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>
              Opening your case…
            </h1>
            <p className="text-sm" style={{ color: "#9ca3af" }}>
              One moment while we verify your secure link.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function EnterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#0a0d12" }} />}>
      <EnterInner />
    </Suspense>
  );
}
