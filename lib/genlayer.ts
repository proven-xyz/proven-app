import { createClient, createAccount } from "genlayer-js";
import { localnet } from "genlayer-js/chains";
import { defineChain } from "viem";

const DEFAULT_SERVER_ENDPOINT = "https://rpc-bradbury.genlayer.com";
const DEFAULT_EXPLORER_URL = "https://explorer-bradbury.genlayer.com";
const DEFAULT_CONSENSUS_MAIN_CONTRACT = "0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D";
const DEFAULT_INITIAL_VALIDATORS = 3;
const DEFAULT_MAX_ROTATIONS = 3;

export const GENLAYER_CONSENSUS_MAIN_ABI = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "payable",
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "numOfInitialValidators",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "maxRotations",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "encodedData",
        type: "bytes",
      },
    ],
    outputs: [],
  },
] as const;

const BRADBURY_CHAIN = defineChain({
  id: 4221,
  name: "GenLayer Bradbury Testnet",
  rpcUrls: {
    default: {
      http: [DEFAULT_SERVER_ENDPOINT],
    },
  },
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: DEFAULT_EXPLORER_URL,
    },
  },
  testnet: true,
  consensusMainContract: {
    address: DEFAULT_CONSENSUS_MAIN_CONTRACT,
    abi: GENLAYER_CONSENSUS_MAIN_ABI,
    bytecode: "0x",
  },
  defaultNumberOfInitialValidators: DEFAULT_INITIAL_VALIDATORS,
  defaultConsensusMaxRotations: DEFAULT_MAX_ROTATIONS,
});

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

  return {
    ...BRADBURY_CHAIN,
    rpcUrls: {
      default: {
        http: [endpoint || DEFAULT_SERVER_ENDPOINT],
      },
    },
    consensusMainContract: {
      address: getConsensusMainContractAddress(),
      abi: GENLAYER_CONSENSUS_MAIN_ABI,
      bytecode: "0x",
    },
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

export function createGenlayerClient(accountAddress?: string) {
  const endpoint = getEndpoint();

  return createClient({
    chain: getChain(endpoint),
    ...(accountAddress ? { account: accountAddress as any } : {}),
  } as any);
}

export function createGenlayerClientWithKey(privateKey: string) {
  const account = createAccount(privateKey as any);
  const endpoint = getEndpoint();

  return createClient({
    chain: getChain(endpoint),
    account,
  } as any);
}

export { createAccount };
