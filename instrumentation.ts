import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  // Dev-only banner. Runs once at server startup so `npm run dev` prints a
  // clickable URL for the apex (under tenant routing it's the only useful
  // entry point — every other URL is a <slug> subdomain of it). Gated by
  // NODE_ENV + nodejs runtime so it doesn't pollute Vercel logs.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "development"
  ) {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
    const protocol = /:\d+$/.test(root) ? "http" : "https";
    // eslint-disable-next-line no-console
    console.log(`\n  \x1b[36m▲ Open:\x1b[0m \x1b[1m${protocol}://${root}\x1b[0m\n`);
  }
}

export const onRequestError = Sentry.captureRequestError;
