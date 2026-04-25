import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

import { initClientSentry } from "./sentry.client.config";

let posthogInitialized = false;

function initPostHog() {
  if (posthogInitialized) {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!apiKey) {
    return;
  }

  posthog.init(apiKey, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://us.i.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "identified_only",
  });
  posthogInitialized = true;
}

initClientSentry();
initPostHog();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
