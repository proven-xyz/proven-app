"use client";

import posthog from "posthog-js";

type AnalyticsScalar = boolean | number | string | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsScalar>;

export const ANALYTICS_EVENTS = {
  walletConnected: "wallet_connected",
  claimCreated: "claim_created",
  claimChallenged: "claim_challenged",
  resolveRequested: "claim_resolve_requested",
  claimCancelled: "claim_cancelled",
  resolvedClaimViewed: "resolved_claim_viewed",
} as const;

type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

function isAnalyticsEnabled() {
  return (
    typeof window !== "undefined" &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim())
  );
}

function normalizeWalletAddress(address: string) {
  return address.toLowerCase();
}

function capture(event: AnalyticsEventName, properties?: AnalyticsProperties) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics should never block the user flow.
  }
}

export function identifyWallet(address: string) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  const walletAddress = normalizeWalletAddress(address);
  try {
    posthog.identify(`wallet:${walletAddress}`, {
      wallet_address: walletAddress,
      auth_method: "injected_wallet",
    });
  } catch {
    // Analytics should never block the user flow.
  }
}

export function resetAnalyticsIdentity() {
  if (!isAnalyticsEnabled()) {
    return;
  }

  try {
    posthog.reset();
  } catch {
    // Analytics should never block the user flow.
  }
}

export function trackWalletConnected(address: string) {
  capture(ANALYTICS_EVENTS.walletConnected, {
    wallet_address: normalizeWalletAddress(address),
    auth_method: "injected_wallet",
  });
}

export function trackClaimCreated(properties: AnalyticsProperties) {
  capture(ANALYTICS_EVENTS.claimCreated, properties);
}

export function trackClaimChallenged(properties: AnalyticsProperties) {
  capture(ANALYTICS_EVENTS.claimChallenged, properties);
}

export function trackResolveRequested(properties: AnalyticsProperties) {
  capture(ANALYTICS_EVENTS.resolveRequested, properties);
}

export function trackClaimCancelled(properties: AnalyticsProperties) {
  capture(ANALYTICS_EVENTS.claimCancelled, properties);
}

export function trackResolvedClaimViewed(properties: AnalyticsProperties) {
  capture(ANALYTICS_EVENTS.resolvedClaimViewed, properties);
}
