import { NextResponse } from "next/server";

import { getVSWithAccess } from "@/lib/contract";
import { getVSByIdFast, VS_CACHE_HEADERS } from "@/lib/server/vs-cache";
import {
  createApiError,
  parseInviteKey,
  parsePositiveIntegerParam,
} from "@/lib/server/api-validation";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: Props) {
  try {
    const vsId = parsePositiveIntegerParam(params.id);
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
      const privateItem = await getVSWithAccess(vsId, inviteKey);
      if (!privateItem) {
        return NextResponse.json(
          createApiError("not_found", "VS not found"),
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        { item: privateItem },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        }
      );
    }

    const item = await getVSByIdFast(vsId);
    if (!item) {
      return NextResponse.json(
        createApiError("not_found", "VS not found"),
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      { item },
      {
        headers: VS_CACHE_HEADERS,
      }
    );
  } catch {
    return NextResponse.json(
      createApiError("internal_error", "Unable to load VS"),
      {
        status: 500,
      }
    );
  }
}
