import { createGenlayerClientWithKey } from "@/lib/genlayer";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ACCEPTED_RETRIES = 10;
const ACCEPTED_INTERVAL_MS = 5000;

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

async function waitForAcceptance(
  client: ReturnType<typeof createGenlayerClientWithKey>,
  txHash: `0x${string}`
) {
  try {
    await client.waitForTransactionReceipt({
      hash: txHash as any,
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

  const address = getContractAddress();
  let txHash: `0x${string}`;
  let claimId: number | null = null;

  switch (request.action) {
    case "create_claim": {
      const beforeCount = await getClaimCount(client);
      txHash = await client.writeContract({
        address: address as any,
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
      txHash = await client.writeContract({
        address: address as any,
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
      txHash = await client.writeContract({
        address: address as any,
        functionName: "challenge_claim",
        args: [request.claimId, request.stakeAmount, request.inviteKey ?? ""],
        value: BigInt(request.stakeAmount),
      });
      break;

    case "resolve_claim":
      txHash = await client.writeContract({
        address: address as any,
        functionName: "resolve_claim",
        args: [request.claimId],
        value: BigInt(0),
      });
      break;

    case "cancel_claim":
      txHash = await client.writeContract({
        address: address as any,
        functionName: "cancel_claim",
        args: [request.claimId],
        value: BigInt(0),
      });
      break;

    default:
      throw new Error("Unsupported demo write action");
  }

  const acceptance = await waitForAcceptance(client, txHash);

  return {
    txHash,
    claimId,
    pending: acceptance.pending,
    actor: account.address || ZERO_ADDRESS,
  };
}
