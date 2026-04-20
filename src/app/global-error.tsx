"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ background: "#0d1117", color: "#c9d1d9", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "96px auto", padding: "0 16px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#7d8590", fontSize: 14 }}>
            The error has been reported. Try refreshing the page or return to the dashboard.
          </p>
        </div>
      </body>
    </html>
  );
}
