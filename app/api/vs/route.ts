import { NextResponse } from "next/server";

import {
  getAllVSFast,
  refreshVSIndex,
  VS_CACHE_HEADERS,
} from "@/lib/server/vs-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldRefresh = searchParams.get("refresh") === "1";
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
}
