import { getEndpoint, getWalletChainParams } from "@/lib/genlayer";

export type HeaderNetworkStatusState = "connected" | "stalled";

export type HeaderNetworkStatus = {
  networkName: string;
  status: HeaderNetworkStatusState;
  checkedAt: string;
  latencyMs: number | null;
  chainId: string | null;
  blockNumber: string | null;
  error: string | null;
};

const HEALTH_CACHE_MS = 4_000;
const HEALTH_TIMEOUT_MS = 3_500;

let cachedStatus: HeaderNetworkStatus | null = null;
let cachedAt = 0;
let inflightStatus: Promise<HeaderNetworkStatus> | null = null;

async function rpcRequest(
  endpoint: string,
  method: string,
  params: unknown[]
): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }

  const payload = (await response.json()) as {
    result?: unknown;
    error?: { message?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message || "rpc_error");
  }

  return payload.result;
}

async function probeNetworkStatus(): Promise<HeaderNetworkStatus> {
  const endpoint = getEndpoint();
  const chain = getWalletChainParams();
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  if (!endpoint) {
    return {
      networkName: chain.chainName,
      status: "stalled",
      checkedAt,
      latencyMs: null,
      chainId: null,
      blockNumber: null,
      error: "missing_endpoint",
    };
  }

  try {
    const [chainId, blockNumber] = await Promise.all([
      rpcRequest(endpoint, "eth_chainId", []),
      rpcRequest(endpoint, "eth_blockNumber", []),
    ]);

    const normalizedChainId =
      typeof chainId === "string" ? chainId.toLowerCase() : null;
    const status: HeaderNetworkStatusState =
      normalizedChainId === chain.chainId.toLowerCase() ? "connected" : "stalled";

    return {
      networkName: chain.chainName,
      status,
      checkedAt,
      latencyMs: Date.now() - startedAt,
      chainId: typeof chainId === "string" ? chainId : null,
      blockNumber: typeof blockNumber === "string" ? blockNumber : null,
      error: status === "connected" ? null : "wrong_chain",
    };
  } catch (error: any) {
    return {
      networkName: chain.chainName,
      status: "stalled",
      checkedAt,
      latencyMs: Date.now() - startedAt,
      chainId: null,
      blockNumber: null,
      error: error?.message || "unreachable",
    };
  }
}

export async function getHeaderNetworkStatus(): Promise<HeaderNetworkStatus> {
  const now = Date.now();
  if (cachedStatus && now - cachedAt < HEALTH_CACHE_MS) {
    return cachedStatus;
  }

  if (inflightStatus) {
    return inflightStatus;
  }

  inflightStatus = probeNetworkStatus()
    .then((status) => {
      cachedStatus = status;
      cachedAt = Date.now();
      return status;
    })
    .finally(() => {
      inflightStatus = null;
    });

  return inflightStatus;
}
