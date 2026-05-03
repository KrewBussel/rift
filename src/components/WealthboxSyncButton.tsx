"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncResult = {
  scanned: number;
  created: number;
  skipped: number;
  closed: number;
  errors: Array<{ opportunityId: string; message: string }>;
};

/**
 * Inline "Sync from Wealthbox" trigger for the cases page header. Posts to
 * the same /api/integrations/wealthbox/poll endpoint the cron uses, then
 * refreshes the page so any newly-created cases show up immediately.
 *
 * Errors are surfaced in a small popover so a stage-mapping or contact-link
 * misconfiguration is visible without digging into Settings.
 */
export default function WealthboxSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setErr(null);
    setResult(null);
    const res = await fetch("/api/integrations/wealthbox/poll", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(body.error ?? `Sync failed (HTTP ${res.status})`);
      return;
    }
    const body = (await res.json()) as { result: SyncResult };
    setResult(body.result);
    // Refresh so newly-created or auto-closed cases reflect in the board.
    if (body.result.created > 0 || body.result.closed > 0) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={sync}
        disabled={busy}
        className="text-xs font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 disabled:opacity-50"
        style={{ background: "#1d2330", color: "#c9d1d9", border: "1px solid #2b3346" }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 6a4 4 0 0 1 7.4-2.1M10 6a4 4 0 0 1-7.4 2.1M9 1.5V4H6.5M3 10.5V8H5.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? "Syncing…" : "Sync Wealthbox"}
      </button>
      {result && (
        <span className="text-[11px] tabular-nums" style={{ color: "#7d8590" }}>
          Scanned {result.scanned} · Created {result.created} · Closed {result.closed} · Skipped {result.skipped}
          {result.errors.length > 0 ? ` · ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}` : ""}
        </span>
      )}
      {result && result.errors.length > 0 && (
        <ul className="text-[11px] mt-1 space-y-0.5 max-w-md text-right" style={{ color: "#f87171" }}>
          {result.errors.slice(0, 3).map((e, i) => (
            <li key={i}>
              <span style={{ color: "#7d8590" }}>opp {e.opportunityId}:</span> {e.message}
            </li>
          ))}
        </ul>
      )}
      {err && (
        <span className="text-[11px]" style={{ color: "#f87171" }}>
          {err}
        </span>
      )}
    </div>
  );
}
