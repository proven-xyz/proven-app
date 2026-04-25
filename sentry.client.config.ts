import * as Sentry from "@sentry/nextjs";

let sentryClientInitialized = false;

export function initClientSentry() {
  if (sentryClientInitialized) {
    return;
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
  });

  sentryClientInitialized = true;
}
