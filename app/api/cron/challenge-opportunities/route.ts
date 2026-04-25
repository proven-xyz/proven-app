import { NextResponse } from "next/server";

import { createApiError } from "@/lib/server/api-validation";
import { refreshChallengeOpportunitiesIndex } from "@/lib/server/challenge-opportunities";
import { createLogger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const logger = createLogger({ route: "/api/cron/challenge-opportunities" });

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${expectedSecret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      logger.warn("Rejected unauthorized challenge opportunities cron request.", {
        hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
      });
      return NextResponse.json(
        createApiError("forbidden", "Invalid cron credentials"),
        { status: 403 }
      );
    }

    if (process.env.NEXT_PUBLIC_FEATURE_SOURCE_DRAFTS !== "1") {
      return NextResponse.json(
        createApiError("feature_disabled", "Challenge opportunities are not enabled"),
        { status: 404 }
      );
    }

    const summary = await refreshChallengeOpportunitiesIndex();

    return NextResponse.json(
      {
        generatedAt: new Date(summary.generatedAt).toISOString(),
        locales: summary.locales,
        countsByLocale: summary.countsByLocale,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to refresh challenge opportunities";
    const status = /not configured/i.test(message) ? 503 : 500;

    logger.error("Challenge opportunities cron request failed.", {
      status,
      error,
    });

    return NextResponse.json(
      createApiError("internal_error", message),
      { status }
    );
  }
}
