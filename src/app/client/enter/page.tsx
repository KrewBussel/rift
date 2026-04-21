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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1117" }}>
      <div className="max-w-md w-full rounded-xl p-8" style={{ background: "#161b22", border: "1px solid #21262d" }}>
        {error ? (
          <>
            <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>Couldn't open your case</h1>
            <p className="text-sm" style={{ color: "#9ca3af" }}>{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-2" style={{ color: "#e4e6ea" }}>Opening your case…</h1>
            <p className="text-sm" style={{ color: "#9ca3af" }}>One moment while we verify your secure link.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function EnterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "#0d1117" }} />}>
      <EnterInner />
    </Suspense>
  );
}
