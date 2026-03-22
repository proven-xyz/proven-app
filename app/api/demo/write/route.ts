import { NextResponse } from "next/server";

import { executeDemoWrite, type DemoWriteRequest } from "@/lib/server/demo-relay";
import { createApiError } from "@/lib/server/api-validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export async function POST(request: Request) {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json(
        createApiError("forbidden", "Demo relay mode is disabled"),
        { status: 403 }
      );
    }

    const payload = (await request.json()) as DemoWriteRequest;
    const result = await executeDemoWrite(payload);

    return NextResponse.json(result, {
      status: result.pending ? 202 : 200,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit demo transaction";

    return NextResponse.json(
      createApiError("internal_error", message),
      { status: 500 }
    );
  }
}
