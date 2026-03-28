import { NextRequest, NextResponse } from "next/server";

import { getUserVSFast, VS_CACHE_HEADERS } from "@/lib/server/vs-cache";
import {
  createApiError,
  parseAddressParam,
} from "@/lib/server/api-validation";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: rawAddress } = await params;
    const address = parseAddressParam(rawAddress);
    if (!address) {
      return NextResponse.json(
        createApiError("invalid_parameter", "Invalid address"),
        {
          status: 400,
        }
      );
    }

    const items = await getUserVSFast(address);

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
      createApiError("internal_error", "Unable to load user VS"),
      {
        status: 500,
      }
    );
  }
}
