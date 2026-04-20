import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Conservative defaults — crank up if you need performance traces
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // Do NOT send PII by default; we'll attach a userId via setUser() in auth.ts
    sendDefaultPii: false,
    // Common noisy errors we don't care about
    ignoreErrors: [
      "NEXT_NOT_FOUND",
      "NEXT_REDIRECT",
      // Prisma P2025 = record not found, already surfaced to caller as 404
      "P2025",
    ],
    beforeSend(event) {
      // Strip request bodies — they can contain passwords, tokens, case notes
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
        }
      }
      return event;
    },
  });
}
