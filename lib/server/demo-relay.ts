import { createGenlayerClientWithKey } from "@/lib/genlayer";
import { parseEventLogs } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ACCEPTED_RETRIES = 10;
const ACCEPTED_INTERVAL_MS = 5000;

/**
 * The actual Bradbury consensus contract emits `CreatedTransaction(bytes32,uint256)`
 * but the genlayer-js SDK expects `NewTransaction(bytes32,address,address)`.
 * This ABI fragment lets us parse the real on-chain event.
 */
const CREATED_TX_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "txId", type: "bytes32" },
      { indexed: false, internalType: "uint256", name: "txSlot", type: "uint256" },
    ],
    name: "CreatedTransaction",
    type: "event",
  },
] as const;

export type RelayCreateClaimParams = {
  question: string;
  creator_position: string;
  counter_position: string;
  resolution_url: string;
  deadline: number;
  stake_amount: number;
  category?: string;
  parent_id?: number;
  market_type?: string;
  odds_mode?: string;
  challenger_payout_bps?: number;
  handicap_line?: string;
  settlement_rule?: string;
  max_challengers?: number;
  visibility?: "public" | "private";
  invite_key?: string;
};

export type DemoWriteRequest =
  | {
      action: "create_claim";
      params: RelayCreateClaimParams;
    }
  | {
      action: "create_rematch";
      parentId: number;
      params: Omit<RelayCreateClaimParams, "parent_id">;
    }
  | {
      action: "challenge_claim";
      claimId: number;
      stakeAmount: number;
      inviteKey?: string;
    }
  | {
      action: "resolve_claim";
      claimId: number;
    }
  | {
      action: "cancel_claim";
      claimId: number;
    };

export type DemoWriteResult = {
  txHash: string;
  claimId: number | null;
  pending: boolean;
  actor: string;
};

function getContractAddress() {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
  if (!address) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured");
  }
  return address;
}

function getSignerPrivateKey(action: DemoWriteRequest["action"]) {
  const creator = process.env.DEMO_CREATOR_PRIVATE_KEY?.trim();
  const challenger = process.env.DEMO_CHALLENGER_PRIVATE_KEY?.trim();
  const resolver = process.env.DEMO_RESOLVER_PRIVATE_KEY?.trim();
  const fallback = process.env.DEMO_SIGNER_PRIVATE_KEY?.trim();

  if (action === "challenge_claim") {
    return challenger || fallback || creator;
  }
  if (action === "resolve_claim") {
    return resolver || fallback || creator || challenger;
  }
  return creator || fallback;
}

async function getClaimCount(client: ReturnType<typeof createGenlayerClientWithKey>) {
  try {
    return (await client.readContract({
      address: getContractAddress() as any,
      functionName: "get_claim_count",
      args: [],
    })) as number;
  } catch {
    return 0;
  }
}

/**
 * Send a write via the SDK, catching the "not processed by consensus" error
 * that occurs because the on-chain contract emits `CreatedTransaction` but
 * the SDK expects `NewTransaction`. We recover the GenLayer txId by fetching
 * the EVM receipt ourselves and parsing `CreatedTransaction`.
 */
async function sendWrite(
  client: ReturnType<typeof createGenlayerClientWithKey>,
  opts: { address: string; functionName: string; args: unknown[]; value: bigint }
): Promise<{ evmHash: string; glTxId: string }> {
  try {
    // The SDK returns the GenLayer txId if event parsing succeeds.
    const glTxId: string = await client.writeContract({
      address: opts.address as any,
      functionName: opts.functionName,
      args: opts.args as any,
      value: opts.value,
    });
    return { evmHash: glTxId, glTxId };
  } catch (err: any) {
    // SDK threw because it couldn't find `NewTransaction` in the receipt.
    // The EVM tx itself succeeded — recover by searching the signer's
    // most recent EVM receipt for `CreatedTransaction`.
    if (!err?.message?.includes("not processed by consensus")) {
      throw err;
    }
  }

  // Fallback: find the latest EVM tx from this signer and parse events.
  const rpcUrl =
    process.env.NEXT_PUBLIC_GENLAYER_RPC ||
    process.env.GENLAYER_RPC ||
    "https://rpc-bradbury.genlayer.com";

  const account = client.account as any;
  const signerAddress = (account?.address as string).toLowerCase();

  async function rpc<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  }

  const latestHex = await rpc<string>("eth_blockNumber", []);
  const latest = parseInt(latestHex, 16);

  for (let i = latest; i > latest - 20 && i >= 0; i--) {
    const block = await rpc<any>("eth_getBlockByNumber", [
      "0x" + i.toString(16),
      true,
    ]);
    const tx = (block?.transactions || []).find(
      (t: any) => t.from?.toLowerCase() === signerAddress
    );
    if (!tx) continue;

    const receipt = await rpc<any>("eth_getTransactionReceipt", [tx.hash]);
    if (receipt?.status === "0x0") {
      throw new Error("Transaction reverted on-chain");
    }

    const events = parseEventLogs({
      abi: CREATED_TX_EVENT_ABI,
      eventName: "CreatedTransaction",
      logs: receipt?.logs ?? [],
    });

    if (events.length > 0 && (events[0] as any).args?.txId) {
      return {
        evmHash: tx.hash,
        glTxId: (events[0] as any).args.txId as string,
      };
    }

    return { evmHash: tx.hash, glTxId: tx.hash };
  }

  throw new Error("Could not locate submitted transaction in recent blocks");
}

async function waitForAcceptance(
  client: ReturnType<typeof createGenlayerClientWithKey>,
  glTxId: string
) {
  try {
    await client.waitForTransactionReceipt({
      hash: glTxId as any,
      status: "ACCEPTED" as any,
      retries: ACCEPTED_RETRIES,
      interval: ACCEPTED_INTERVAL_MS,
    });
    return { pending: false };
  } catch {
    return { pending: true };
  }
}

export async function executeDemoWrite(
  request: DemoWriteRequest
): Promise<DemoWriteResult> {
  const privateKey = getSignerPrivateKey(request.action);
  if (!privateKey) {
    throw new Error(`No demo signer configured for ${request.action}`);
  }

  const client = createGenlayerClientWithKey(privateKey as `0x${string}`);
  const account = client.account;
  if (!account || typeof account === "string") {
    throw new Error("Failed to initialize demo signer account");
  }

  const contractAddress = getContractAddress();
  let writeResult: { evmHash: string; glTxId: string };
  let claimId: number | null = null;

  switch (request.action) {
    case "create_claim": {
      const beforeCount = await getClaimCount(client);
      writeResult = await sendWrite(client, {
        address: contractAddress,
        functionName: "create_claim",
        args: [
          request.params.question,
          request.params.creator_position,
          request.params.counter_position,
          request.params.resolution_url,
          request.params.deadline,
          request.params.stake_amount,
          request.params.category ?? "custom",
          request.params.parent_id ?? 0,
          request.params.market_type ?? "binary",
          request.params.odds_mode ?? "pool",
          request.params.challenger_payout_bps ?? 0,
          request.params.handicap_line ?? "",
          request.params.settlement_rule ?? "",
          request.params.max_challengers ?? 0,
          request.params.visibility ?? "public",
          request.params.invite_key ?? "",
        ],
        value: BigInt(request.params.stake_amount),
      });
      claimId = beforeCount + 1;
      break;
    }

    case "create_rematch": {
      const beforeCount = await getClaimCount(client);
      writeResult = await sendWrite(client, {
        address: contractAddress,
        functionName: "create_rematch",
        args: [
          request.parentId,
          request.params.deadline,
          request.params.stake_amount,
          request.params.question,
          request.params.creator_position,
          request.params.counter_position,
          request.params.resolution_url,
          request.params.category ?? "",
          request.params.market_type ?? "",
          request.params.odds_mode ?? "",
          request.params.challenger_payout_bps ?? 0,
          request.params.handicap_line ?? "",
          request.params.settlement_rule ?? "",
          request.params.max_challengers ?? 0,
          request.params.visibility ?? "public",
          request.params.invite_key ?? "",
        ],
        value: BigInt(request.params.stake_amount),
      });
      claimId = beforeCount + 1;
      break;
    }

    case "challenge_claim":
      writeResult = await sendWrite(client, {
        address: contractAddress,
        functionName: "challenge_claim",
        args: [request.claimId, request.stakeAmount, request.inviteKey ?? ""],
        value: BigInt(request.stakeAmount),
      });
      break;

    case "resolve_claim":
      writeResult = await sendWrite(client, {
        address: contractAddress,
        functionName: "resolve_claim",
        args: [request.claimId],
        value: BigInt(0),
      });
      break;

    case "cancel_claim":
      writeResult = await sendWrite(client, {
        address: contractAddress,
        functionName: "cancel_claim",
        args: [request.claimId],
        value: BigInt(0),
      });
      break;

    default:
      throw new Error("Unsupported demo write action");
  }

  const acceptance = await waitForAcceptance(client, writeResult.glTxId);

  return {
    txHash: writeResult.evmHash,
    claimId,
    pending: acceptance.pending,
    actor: (account as any).address || ZERO_ADDRESS,
  };
}
