import { createClient, createAccount } from "genlayer-js";
import { localnet, testnetBradbury } from "genlayer-js/chains";

const DEFAULT_SERVER_ENDPOINT = "https://rpc-bradbury.genlayer.com";
const DEFAULT_EXPLORER_URL = "https://explorer-bradbury.genlayer.com";
const DEFAULT_CONSENSUS_MAIN_CONTRACT = "0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D";

export const GENLAYER_CONSENSUS_MAIN_ABI = (testnetBradbury as any).consensusMainContract.abi;

const BRADBURY_CHAIN = testnetBradbury;

export function getEndpoint() {
  if (process.env.NEXT_PUBLIC_GENLAYER_RPC) {
    return process.env.NEXT_PUBLIC_GENLAYER_RPC;
  }

  if (typeof window === "undefined") {
    return process.env.GENLAYER_RPC || DEFAULT_SERVER_ENDPOINT;
  }

  return undefined;
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
  return (
    process.env.NEXT_PUBLIC_GENLAYER_MAIN_CONTRACT ||
    process.env.GENLAYER_MAIN_CONTRACT ||
    DEFAULT_CONSENSUS_MAIN_CONTRACT
  );
}

function getChain(endpoint?: string) {
  if (isLocalEndpoint(endpoint)) {
    return {
      ...localnet,
      rpcUrls: {
        default: {
          http: [endpoint],
        },
      },
    };
  }

  const mainContractAddress = getConsensusMainContractAddress();
  return {
    ...BRADBURY_CHAIN,
    rpcUrls: {
      default: {
        http: [endpoint || DEFAULT_SERVER_ENDPOINT],
      },
    },
    ...(mainContractAddress !== DEFAULT_CONSENSUS_MAIN_CONTRACT
      ? {
          consensusMainContract: {
            ...(BRADBURY_CHAIN as any).consensusMainContract,
            address: mainContractAddress,
          },
        }
      : {}),
  };
}

export function getWalletChainParams() {
  const endpoint = getEndpoint() || DEFAULT_SERVER_ENDPOINT;
  return {
    chainId: `0x${BRADBURY_CHAIN.id.toString(16)}`,
    chainName: BRADBURY_CHAIN.name,
    rpcUrls: [endpoint],
    nativeCurrency: BRADBURY_CHAIN.nativeCurrency,
    blockExplorerUrls: [DEFAULT_EXPLORER_URL],
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

export function getExplorerTxUrl(txHash: string) {
  return `${DEFAULT_EXPLORER_URL}/transactions/${txHash}`;
}

export { createAccount };
