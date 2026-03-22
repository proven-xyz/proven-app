import { NextResponse } from "next/server";

import {
  getAllVSFast,
  refreshVSIndex,
  VS_CACHE_HEADERS,
} from "@/lib/server/vs-cache";
import { createApiError } from "@/lib/server/api-validation";

export const dynamic = "force-dynamic";

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
    const items = shouldRefresh
      ? (await refreshVSIndex()).items
      : await getAllVSFast();

    return NextResponse.json(
      {
        items,
        count: items.length,
      },
      {
        headers: VS_CACHE_HEADERS,
      }
    );
  } catch {
    return NextResponse.json(
      createApiError("internal_error", "Unable to load VS feed"),
      {
        status: 500,
      }
    );
  }
}
