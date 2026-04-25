import { NextRequest, NextResponse } from "next/server";

import {
  createApiError,
  parseInviteKey,
  parsePositiveIntegerParam,
} from "@/lib/server/api-validation";
import { createLogger } from "@/lib/server/logger";
import { getVsDetailSnapshot, getVsWithInvite } from "@/lib/server/vs-index";
import { makeContractFreshness } from "@/lib/vs-freshness";
import { VS_CACHE_HEADERS } from "@/lib/server/vs-cache";

export const dynamic = "force-dynamic";
const logger = createLogger({ route: "/api/vs/[id]" });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vsId = parsePositiveIntegerParam(id);
    if (!vsId) {
      return NextResponse.json(
        createApiError("invalid_parameter", "Invalid VS id"),
        {
          status: 400,
        }
      );
    }

    const inviteKey = parseInviteKey(
      new URL(request.url).searchParams.get("invite")
    );
    if (inviteKey === null) {
      return NextResponse.json(
        createApiError("invalid_parameter", "Invalid invite key"),
        {
          status: 400,
        }
      );
    }

    if (inviteKey) {
      const privateItem = await getVsWithInvite(vsId, inviteKey);
      if (!privateItem) {
        return NextResponse.json(
          createApiError("not_found", "VS not found"),
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        {
          item: privateItem,
          cache: makeContractFreshness(),
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        }
      );
    }

    const { item, cache } = await getVsDetailSnapshot(vsId);
    if (!item) {
      return NextResponse.json(
        createApiError("not_found", "VS not found"),
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        item,
        cache,
      },
      {
        headers: VS_CACHE_HEADERS,
      }
    );
  } catch (error) {
    logger.error("VS detail request failed.", {
      error,
      requestUrl: request.url,
    });
    return NextResponse.json(
      createApiError("internal_error", "Unable to load VS"),
      {
        status: 500,
      }
    );
  }
}
