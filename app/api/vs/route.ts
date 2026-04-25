import { NextResponse } from "next/server";

import { createApiError } from "@/lib/server/api-validation";
import { createLogger } from "@/lib/server/logger";
import { getVsFeedSnapshot } from "@/lib/server/vs-index";
import { VS_CACHE_HEADERS } from "@/lib/server/vs-cache";

export const dynamic = "force-dynamic";
const logger = createLogger({ route: "/api/vs" });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refreshValue = searchParams.get("refresh");
    if (refreshValue && refreshValue !== "1") {
      return NextResponse.json(
        createApiError("invalid_parameter", "refresh must be 1 when provided"),
        {
          status: 400,
        }
      );
    }

    const shouldRefresh = refreshValue === "1";
    const { items, cache } = await getVsFeedSnapshot({ forceRefresh: shouldRefresh });

    return NextResponse.json(
      {
        items,
        count: items.length,
        cache,
      },
      {
        headers: VS_CACHE_HEADERS,
      }
    );
  } catch (error) {
    logger.error("VS feed request failed.", {
      error,
      requestUrl: request.url,
    });
    return NextResponse.json(
      createApiError("internal_error", "Unable to load VS feed"),
      {
        status: 500,
      }
    );
  }
}
