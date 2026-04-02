import { createClient, createAccount } from "genlayer-js";
import {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} from "genlayer-js/chains";

export type SupportedGenlayerNetwork =
  | "localnet"
  | "studionet"
  | "testnet-asimov"
  | "testnet-bradbury";

type GenlayerNetworkConfig = {
  alias: SupportedGenlayerNetwork;
  chain: any;
  defaultRpc: string;
  defaultExplorer: string;
  defaultConsensusMainContract: string;
};

const DEFAULT_NETWORK_ALIAS: SupportedGenlayerNetwork = "testnet-bradbury";

const NETWORK_CONFIGS: Record<SupportedGenlayerNetwork, GenlayerNetworkConfig> = {
  localnet: {
    alias: "localnet",
    chain: localnet,
    defaultRpc: "http://127.0.0.1:4000/api",
    defaultExplorer: "http://127.0.0.1:4000/api",
    defaultConsensusMainContract: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575",
  },
  studionet: {
    alias: "studionet",
    chain: studionet,
    defaultRpc: "https://studio.genlayer.com/api",
    defaultExplorer: "https://genlayer-explorer.vercel.app",
    defaultConsensusMainContract: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575",
  },
  "testnet-asimov": {
    alias: "testnet-asimov",
    chain: testnetAsimov,
    defaultRpc: "https://rpc-asimov.genlayer.com",
    defaultExplorer: "https://explorer-asimov.genlayer.com",
    defaultConsensusMainContract: "0x6CAFF6769d70824745AD895663409DC70aB5B28E",
  },
  "testnet-bradbury": {
    alias: "testnet-bradbury",
    chain: testnetBradbury,
    defaultRpc: "https://rpc-bradbury.genlayer.com",
    defaultExplorer: "https://explorer-bradbury.genlayer.com",
    defaultConsensusMainContract: "0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D",
  },
};

const NETWORK_ALIASES: Record<string, SupportedGenlayerNetwork> = {
  local: "localnet",
  localnet: "localnet",
  studio: "studionet",
  studionet: "studionet",
  asimov: "testnet-asimov",
  "testnet-asimov": "testnet-asimov",
  bradbury: "testnet-bradbury",
  "testnet-bradbury": "testnet-bradbury",
};

function normalizeNetworkAlias(
  network: string | undefined | null
): SupportedGenlayerNetwork | null {
  const normalized = String(network ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return NETWORK_ALIASES[normalized] ?? null;
}

function inferNetworkAliasFromEndpoint(
  endpoint: string | undefined
): SupportedGenlayerNetwork | null {
  if (!endpoint) {
    return null;
  }

  const normalized = endpoint.toLowerCase();
  if (normalized.includes("127.0.0.1") || normalized.includes("localhost")) {
    return "localnet";
  }
  if (normalized.includes("studio.genlayer.com")) {
    return "studionet";
  }
  if (normalized.includes("rpc-asimov.genlayer.com")) {
    return "testnet-asimov";
  }
  if (normalized.includes("rpc-bradbury.genlayer.com")) {
    return "testnet-bradbury";
  }

  return null;
}

function getConfiguredNetworkFromEnv() {
  return normalizeNetworkAlias(
    process.env.NEXT_PUBLIC_GENLAYER_NETWORK || process.env.GENLAYER_NETWORK
  );
}

function getConfiguredEndpointFromEnv() {
  return (
    process.env.NEXT_PUBLIC_GENLAYER_RPC ||
    (typeof window === "undefined" ? process.env.GENLAYER_RPC : undefined)
  );
}

function getConfiguredExplorerOverride() {
  return (
    process.env.NEXT_PUBLIC_GENLAYER_EXPLORER ||
    process.env.GENLAYER_EXPLORER ||
    undefined
  );
}

function getBaseNetworkAlias(): SupportedGenlayerNetwork {
  return (
    getConfiguredNetworkFromEnv() ??
    inferNetworkAliasFromEndpoint(getConfiguredEndpointFromEnv()) ??
    DEFAULT_NETWORK_ALIAS
  );
}

function getBaseNetworkConfig(): GenlayerNetworkConfig {
  return NETWORK_CONFIGS[getBaseNetworkAlias()];
}

export const GENLAYER_CONSENSUS_MAIN_ABI = (
  getBaseNetworkConfig().chain as any
).consensusMainContract.abi;

export function getConfiguredNetworkAlias(): SupportedGenlayerNetwork {
  return getBaseNetworkAlias();
}

export function getConfiguredNetworkName() {
  return getBaseNetworkConfig().chain.name;
}

export function getEndpoint() {
  const explicitEndpoint = getConfiguredEndpointFromEnv();
  if (explicitEndpoint) {
    return explicitEndpoint;
  }

  return getBaseNetworkConfig().defaultRpc;
}

function isLocalEndpoint(endpoint?: string) {
  if (!endpoint) {
    return false;
  }

  try {
    const url = new URL(endpoint);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return endpoint.includes("127.0.0.1") || endpoint.includes("localhost");
  }
}

export function getConsensusMainContractAddress() {
  const selectedNetwork = getBaseNetworkConfig();
  return (
    process.env.NEXT_PUBLIC_GENLAYER_MAIN_CONTRACT ||
    process.env.GENLAYER_MAIN_CONTRACT ||
    selectedNetwork.defaultConsensusMainContract
  );
}

function getChain(endpoint?: string) {
  const baseNetwork = getBaseNetworkConfig();
  const resolvedEndpoint = endpoint || getEndpoint() || baseNetwork.defaultRpc;
  const activeNetwork = isLocalEndpoint(resolvedEndpoint)
    ? NETWORK_CONFIGS.localnet
    : baseNetwork;
  const mainContractAddress =
    process.env.NEXT_PUBLIC_GENLAYER_MAIN_CONTRACT ||
    process.env.GENLAYER_MAIN_CONTRACT ||
    activeNetwork.defaultConsensusMainContract;

  return {
    ...activeNetwork.chain,
    rpcUrls: {
      default: {
        http: [resolvedEndpoint],
      },
    },
    ...(mainContractAddress !== activeNetwork.defaultConsensusMainContract
      ? {
          consensusMainContract: {
            ...(activeNetwork.chain as any).consensusMainContract,
            address: mainContractAddress,
          },
        }
      : {}),
  };
}

export function getGenlayerChain() {
  return getChain(getEndpoint());
}

export function getExplorerBaseUrl() {
  return (getConfiguredExplorerOverride() || getBaseNetworkConfig().defaultExplorer).replace(
    /\/+$/,
    ""
  );
}

export function getWalletChainParams() {
  const selectedNetwork = getBaseNetworkConfig();
  const endpoint = getEndpoint() || selectedNetwork.defaultRpc;
  return {
    chainId: `0x${selectedNetwork.chain.id.toString(16)}`,
    chainName: selectedNetwork.chain.name,
    rpcUrls: [endpoint],
    nativeCurrency: selectedNetwork.chain.nativeCurrency,
    blockExplorerUrls: [getExplorerBaseUrl()],
  };
}

export async function ensureGenlayerWalletChain(ethereum: {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
}) {
  const params = getWalletChainParams();
  const currentChainId = (await ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId === params.chainId) {
    try {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [params],
      });
    } catch {
      // Asimov and Bradbury share a chain id, so treat refresh failures as non-fatal.
    }
    return;
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.chainId }],
    });
  } catch (error: any) {
    if (error?.code !== 4902) {
      throw error;
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [params],
    });
  }
}

function isConsensusInitNoise(args: unknown[]) {
  const [first, second] = args;
  return (
    typeof first === "string" &&
    first.includes("Failed to initialize consensus smart contract:") &&
    second instanceof Error &&
    second.message === "Client is not connected to the simulator"
  );
}

function createClientWithoutConsensusNoise(factory: () => ReturnType<typeof createClient>) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (isConsensusInitNoise(args)) {
      return;
    }
    originalConsoleError(...(args as Parameters<typeof console.error>));
  };

  try {
    const client = factory();
    queueMicrotask(() => {
      console.error = originalConsoleError;
    });
    return client;
  } catch (error) {
    console.error = originalConsoleError;
    throw error;
  }
}

export function createGenlayerClient(accountAddress?: string) {
  const endpoint = getEndpoint();

  return createClientWithoutConsensusNoise(() =>
    createClient({
      chain: getChain(endpoint),
      ...(accountAddress 
        ? { account: accountAddress as any}
        : { account: null as any}),
    } as any)
  );
}

export function createGenlayerClientWithKey(privateKey: string) {
  const account = createAccount(privateKey as any);
  const endpoint = getEndpoint();

  return createClientWithoutConsensusNoise(() =>
    createClient({
      chain: getChain(endpoint),
      account,
    } as any)
  );
}

export function getExplorerUrl() {
  return `${getExplorerBaseUrl()}/txs`;
}

export function getExplorerTxUrl(txHash: string) {
  return `${getExplorerBaseUrl()}/tx/${txHash}`;
}

export { createAccount };
