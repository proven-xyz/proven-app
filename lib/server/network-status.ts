import {
  getConfiguredNetworkAlias,
  getEndpoint,
  getWalletChainParams,
  type SupportedGenlayerNetwork,
} from "@/lib/genlayer";

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

type NetworkStatusCacheEntry = {
  cachedStatus: HeaderNetworkStatus | null;
  cachedAt: number;
  inflightStatus: Promise<HeaderNetworkStatus> | null;
};

const NETWORK_STATUS_CACHE = new Map<
  SupportedGenlayerNetwork,
  NetworkStatusCacheEntry
>();

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

function getNetworkStatusCacheEntry(network: SupportedGenlayerNetwork) {
  let entry = NETWORK_STATUS_CACHE.get(network);
  if (!entry) {
    entry = {
      cachedStatus: null,
      cachedAt: 0,
      inflightStatus: null,
    };
    NETWORK_STATUS_CACHE.set(network, entry);
  }

  return entry;
}

async function probeNetworkStatus(
  network: SupportedGenlayerNetwork
): Promise<HeaderNetworkStatus> {
  const endpoint = getEndpoint(network);
  const chain = getWalletChainParams(network);
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

export async function getHeaderNetworkStatus(
  network = getConfiguredNetworkAlias()
): Promise<HeaderNetworkStatus> {
  const cacheEntry = getNetworkStatusCacheEntry(network);
  const now = Date.now();
  if (cacheEntry.cachedStatus && now - cacheEntry.cachedAt < HEALTH_CACHE_MS) {
    return cacheEntry.cachedStatus;
  }

  if (cacheEntry.inflightStatus) {
    return cacheEntry.inflightStatus;
  }

  cacheEntry.inflightStatus = probeNetworkStatus(network)
    .then((status) => {
      cacheEntry.cachedStatus = status;
      cacheEntry.cachedAt = Date.now();
      return status;
    })
    .finally(() => {
      cacheEntry.inflightStatus = null;
    });

  return cacheEntry.inflightStatus;
}
