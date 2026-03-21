import { NextResponse } from "next/server";

import { getUserVSFast, VS_CACHE_HEADERS } from "@/lib/server/vs-cache";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    address: string;
  };
};

export async function GET(_: Request, { params }: Props) {
  const address = params.address?.trim();
  if (!address) {
    return NextResponse.json(
      { error: "Address is required" },
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
}
