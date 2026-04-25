import { NextResponse } from "next/server";

import { parseSupportedGenlayerNetwork } from "@/lib/genlayer";
import { getHeaderNetworkStatus } from "@/lib/server/network-status";
import { createLogger } from "@/lib/server/logger";

const logger = createLogger({ route: "/api/network-status" });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedNetwork = searchParams.get("network");
    const network = requestedNetwork
      ? parseSupportedGenlayerNetwork(requestedNetwork)
      : null;

    if (requestedNetwork && !network) {
      return NextResponse.json(
        {
          error: "invalid_network",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const status = await getHeaderNetworkStatus(network ?? undefined);

    return NextResponse.json(status, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    logger.error("Network status request failed.", {
      error,
      requestUrl: request.url,
    });

    return NextResponse.json(
      {
        error: "internal_error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
