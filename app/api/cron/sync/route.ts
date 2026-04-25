import { NextResponse } from "next/server";

import { createApiError } from "@/lib/server/api-validation";
import { createLogger } from "@/lib/server/logger";
import { reconcileVsIndex } from "@/lib/server/vs-index";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const logger = createLogger({ route: "/api/cron/sync" });

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
      logger.warn("Rejected unauthorized VS sync cron request.", {
        hasAuthorizationHeader: Boolean(request.headers.get("authorization")),
      });
      return NextResponse.json(
        createApiError("forbidden", "Invalid cron credentials"),
        { status: 403 }
      );
    }

    const summary = await reconcileVsIndex();

    return NextResponse.json(
      {
        synced: summary.synced,
        new: summary.new,
        stateChanges: summary.stateChanges,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    logger.error("VS sync cron request failed.", {
      error,
    });
    return NextResponse.json(
      createApiError("internal_error", "Unable to reconcile VS index"),
      { status: 500 }
    );
  }
}
