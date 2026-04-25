import { NextResponse } from "next/server";

import {
  createApiError,
  parseInviteKey,
  parsePositiveIntegerParam,
} from "@/lib/server/api-validation";
import { createLogger } from "@/lib/server/logger";
import { triggerPostWriteRefresh } from "@/lib/server/vs-index";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const logger = createLogger({ route: "/api/vs/sync" });

type RefreshBody = {
  claimId?: number;
  inviteKey?: string | null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RefreshBody;
    const claimId = parsePositiveIntegerParam(
      payload.claimId == null ? undefined : String(payload.claimId)
    );

    if (!claimId) {
      return NextResponse.json(
        createApiError("invalid_parameter", "Invalid claim id"),
        { status: 400 }
      );
    }

    const inviteKey = parseInviteKey(payload.inviteKey ?? null);
    if (inviteKey === null) {
      return NextResponse.json(
        createApiError("invalid_parameter", "Invalid invite key"),
        { status: 400 }
      );
    }

    const claim = await triggerPostWriteRefresh({
      claimId,
      inviteKey,
    });

    return NextResponse.json(
      {
        indexed: Boolean(claim),
      },
      {
        status: claim ? 200 : 202,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    logger.error("VS sync request failed.", {
      error,
    });
    return NextResponse.json(
      createApiError("internal_error", "Unable to refresh VS index"),
      { status: 500 }
    );
  }
}
