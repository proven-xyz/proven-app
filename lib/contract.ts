import { createGenlayerClient } from "./genlayer";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as any;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export interface ClaimChallenger {
  address: string;
  stake: number;
  potential_payout: number;
}

export interface ClaimData {
  id: number;
  creator: string;
  question: string;
  creator_position: string;
  counter_position: string;
  resolution_url: string;
  creator_stake: number;
  total_challenger_stake: number;
  reserved_creator_liability: number;
  available_creator_liability: number;
  deadline: number;
  state: "open" | "active" | "resolved" | "cancelled";
  winner_side: "creator" | "challengers" | "draw" | "unresolvable" | "";
  resolution_summary: string;
  confidence: number;
  category: string;
  parent_id: number;
  challenger_count: number;
  market_type: string;
  odds_mode: string;
  challenger_payout_bps: number;
  handicap_line: string;
  settlement_rule: string;
  max_challengers: number;
  created_at: number;
  challengers: ClaimChallenger[];
  total_pot: number;
}

export interface VSData {
  id: number;
  creator: string;
  opponent: string;
  question: string;
  creator_position: string;
  opponent_position: string;
  resolution_url: string;
  stake_amount: number;
  deadline: number;
  state: "open" | "accepted" | "resolved" | "cancelled";
  winner: string;
  resolution_summary: string;
  created_at: number;
  category: string;
  challengers?: ClaimChallenger[];
  counter_position?: string;
  creator_stake?: number;
  total_challenger_stake?: number;
  reserved_creator_liability?: number;
  available_creator_liability?: number;
  winner_side?: ClaimData["winner_side"];
  confidence?: number;
  parent_id?: number;
  challenger_count?: number;
  market_type?: string;
  odds_mode?: string;
  challenger_payout_bps?: number;
  handicap_line?: string;
  settlement_rule?: string;
  max_challengers?: number;
  total_pot?: number;
}

export interface CreateClaimParams {
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
}

function mapClaimToVS(claim: ClaimData): VSData {
  const firstChallenger = claim.challengers[0]?.address ?? ZERO_ADDRESS;
  const compatState =
    claim.state === "active"
      ? "accepted"
      : (claim.state as VSData["state"]);

  let winner = ZERO_ADDRESS;
  if (claim.winner_side === "creator") {
    winner = claim.creator;
  } else if (
    claim.winner_side === "challengers" &&
    claim.challenger_count === 1
  ) {
    winner = firstChallenger;
  }

  return {
    ...claim,
    opponent: firstChallenger,
    opponent_position: claim.counter_position,
    stake_amount: claim.creator_stake,
    state: compatState,
    winner,
  };
}

async function writeAndWait(functionName: string, wallet: string, args: unknown[], value: number) {
  const client = createGenlayerClient(wallet);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as any,
    value: BigInt(value),
  });

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED" as any,
    retries: 200,
    interval: 5000,
  });

  return { txHash, receipt };
}

export async function getClaim(claimId: number): Promise<ClaimData | null> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_claim",
      args: [claimId],
    })) as unknown as ClaimData;
  } catch {
    return null;
  }
}

export async function getClaimCount(): Promise<number> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_claim_count",
      args: [],
    })) as unknown as number;
  } catch {
    return 0;
  }
}

export async function getUserClaims(address: string): Promise<number[]> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_user_claims",
      args: [address],
    })) as unknown as number[];
  } catch {
    return [];
  }
}

export async function getOpenClaims(): Promise<number[]> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_open_claims",
      args: [],
    })) as unknown as number[];
  } catch {
    return [];
  }
}

export async function getRivalryChain(claimId: number): Promise<number[]> {
  try {
    const client = createGenlayerClient();
    return (await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_rivalry_chain",
      args: [claimId],
    })) as unknown as number[];
  } catch {
    return [];
  }
}

export async function createClaim(wallet: string, params: CreateClaimParams) {
  return writeAndWait(
    "create_claim",
    wallet,
    [
      params.question,
      params.creator_position,
      params.counter_position,
      params.resolution_url,
      params.deadline,
      params.stake_amount,
      params.category ?? "custom",
      params.parent_id ?? 0,
      params.market_type ?? "binary",
      params.odds_mode ?? "pool",
      params.challenger_payout_bps ?? 0,
      params.handicap_line ?? "",
      params.settlement_rule ?? "",
      params.max_challengers ?? 0,
    ],
    params.stake_amount
  );
}

export async function createRematch(
  wallet: string,
  parentId: number,
  params: Omit<CreateClaimParams, "parent_id">
) {
  return writeAndWait(
    "create_rematch",
    wallet,
    [
      parentId,
      params.deadline,
      params.stake_amount,
      params.question,
      params.creator_position,
      params.counter_position,
      params.resolution_url,
      params.category ?? "",
      params.market_type ?? "",
      params.odds_mode ?? "",
      params.challenger_payout_bps ?? 0,
      params.handicap_line ?? "",
      params.settlement_rule ?? "",
      params.max_challengers ?? 0,
    ],
    params.stake_amount
  );
}

export async function challengeClaim(wallet: string, claimId: number, stakeAmount: number) {
  return writeAndWait(
    "challenge_claim",
    wallet,
    [claimId, stakeAmount],
    stakeAmount
  );
}

export async function resolveClaim(wallet: string, claimId: number) {
  return writeAndWait("resolve_claim", wallet, [claimId], 0);
}

export async function cancelClaim(wallet: string, claimId: number) {
  return writeAndWait("cancel_claim", wallet, [claimId], 0);
}

export async function getVS(vsId: number): Promise<VSData | null> {
  const claim = await getClaim(vsId);
  return claim ? mapClaimToVS(claim) : null;
}

export async function getVSCount(): Promise<number> {
  return getClaimCount();
}

export async function getUserVSList(address: string): Promise<number[]> {
  return getUserClaims(address);
}

export async function createVS(
  wallet: string,
  params: {
    question: string;
    creator_position: string;
    opponent_position: string;
    resolution_url: string;
    deadline: number;
    stake_amount: number;
    category: string;
  }
) {
  return createClaim(wallet, {
    question: params.question,
    creator_position: params.creator_position,
    counter_position: params.opponent_position,
    resolution_url: params.resolution_url,
    deadline: params.deadline,
    stake_amount: params.stake_amount,
    category: params.category,
    market_type: "binary",
    odds_mode: "pool",
    max_challengers: 1,
  });
}

export async function acceptVS(wallet: string, vsId: number, stakeAmount: number) {
  return challengeClaim(wallet, vsId, stakeAmount);
}

export async function resolveVS(wallet: string, vsId: number) {
  return resolveClaim(wallet, vsId);
}

export async function cancelVS(wallet: string, vsId: number) {
  return cancelClaim(wallet, vsId);
}
