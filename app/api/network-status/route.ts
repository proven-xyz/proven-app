import { NextResponse } from "next/server";

import { getHeaderNetworkStatus } from "@/lib/server/network-status";

export async function GET() {
  const status = await getHeaderNetworkStatus();

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
