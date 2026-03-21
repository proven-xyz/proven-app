import { NextResponse } from "next/server";

import { getVSByIdFast, VS_CACHE_HEADERS } from "@/lib/server/vs-cache";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, { params }: Props) {
  const vsId = Number(params.id);
  if (!Number.isInteger(vsId) || vsId <= 0) {
    return NextResponse.json(
      { error: "Invalid VS id" },
      {
        status: 400,
      }
    );
  }

  const item = await getVSByIdFast(vsId);
  if (!item) {
    return NextResponse.json(
      { error: "VS not found" },
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
}
