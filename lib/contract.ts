import { abi as genlayerAbi } from "genlayer-js";
import { encodeFunctionData, toHex } from "viem";

import {
  createGenlayerClient,
  ensureGenlayerWalletChain,
  GENLAYER_CONSENSUS_MAIN_ABI,
  getConsensusMainContractAddress,
} from "./genlayer";

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
  visibility?: "public" | "private";
  is_private?: boolean;
  challengers?: ClaimChallenger[];
  first_challenger?: string;
  challenger_addresses?: string[];
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
  visibility?: ClaimData["visibility"];
  is_private?: boolean;
  total_pot?: number;
  challenger_addresses?: string[];
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
  visibility?: "public" | "private";
  invite_key?: string;
}

export interface ContractWriteResult {
  txHash: string;
  receipt: unknown;
}

export interface ClaimWriteResult extends ContractWriteResult {
  claimId: number | null;
}

function normalizeClaimData(claim: ClaimData): ClaimData {
  const challengerAddresses =
    claim.challenger_addresses ?? claim.challengers?.map((challenger) => challenger.address) ?? [];

  return {
    ...claim,
    first_challenger: claim.first_challenger ?? challengerAddresses[0] ?? ZERO_ADDRESS,
    challenger_addresses: challengerAddresses,
  };
}

function isSameAddress(a: string | undefined, b: string | undefined) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function getConfiguredMaxChallengers(vs: VSData) {
  if (typeof vs.max_challengers === "number" && vs.max_challengers > 0) {
    return vs.max_challengers;
  }
  return 1;
}

export function isVSPrivate(vs: Pick<VSData, "is_private" | "visibility">) {
  return Boolean(vs.is_private || vs.visibility === "private");
}

export function getVSChallengerCount(vs: VSData) {
  if (typeof vs.challenger_count === "number" && vs.challenger_count >= 0) {
    return vs.challenger_count;
  }
  return vs.opponent !== ZERO_ADDRESS ? 1 : 0;
}

export function getVSTotalPot(vs: VSData) {
  if (typeof vs.total_pot === "number" && Number.isFinite(vs.total_pot)) {
    return vs.total_pot;
  }
  if (
    typeof vs.creator_stake === "number" &&
    typeof vs.total_challenger_stake === "number"
  ) {
    return vs.creator_stake + vs.total_challenger_stake;
  }
  return vs.stake_amount * (vs.opponent === ZERO_ADDRESS ? 1 : 2);
}

export function didUserChallengeVS(vs: VSData, address?: string | null) {
  if (!address) {
    return false;
  }

  if ((vs.challenger_addresses ?? []).some((entry) => isSameAddress(entry, address))) {
    return true;
  }

  return vs.opponent !== ZERO_ADDRESS && isSameAddress(vs.opponent, address);
}

export function hasVSWinner(vs: VSData) {
  if (vs.winner_side === "creator" || vs.winner_side === "challengers") {
    return true;
  }
  return vs.winner !== ZERO_ADDRESS;
}

export function isVSJoinable(vs: VSData, address?: string | null) {
  if (vs.state !== "open" && vs.state !== "accepted") {
    return false;
  }
  if (address) {
    if (isSameAddress(vs.creator, address) || didUserChallengeVS(vs, address)) {
      return false;
    }
  }
  return getVSChallengerCount(vs) < getConfiguredMaxChallengers(vs);
}

export function getVSSingleWinnerPayout(vs: VSData) {
  if (!hasVSWinner(vs)) {
    return 0;
  }

  if (vs.winner_side === "creator" || isSameAddress(vs.winner, vs.creator)) {
    return getVSTotalPot(vs);
  }

  if (vs.winner_side === "challengers") {
    if (getVSChallengerCount(vs) !== 1) {
      return null;
    }

    const challengerStake =
      typeof vs.total_challenger_stake === "number" && vs.total_challenger_stake > 0
        ? vs.total_challenger_stake
        : vs.stake_amount;

    if (
      vs.odds_mode === "fixed" &&
      typeof vs.challenger_payout_bps === "number" &&
      vs.challenger_payout_bps > 0
    ) {
      return Math.floor((challengerStake * vs.challenger_payout_bps) / 10000);
    }

    return getVSTotalPot(vs);
  }

  if (vs.winner !== ZERO_ADDRESS) {
    return getVSTotalPot(vs);
  }

  return 0;
}

export function didUserWinVS(vs: VSData, address?: string | null) {
  if (!address || !hasVSWinner(vs)) {
    return false;
  }
  if (vs.winner_side === "creator") {
    return isSameAddress(vs.creator, address);
  }
  if (vs.winner_side === "challengers") {
    return didUserChallengeVS(vs, address);
  }
  return isSameAddress(vs.winner, address);
}

export function didUserLoseVS(vs: VSData, address?: string | null) {
  if (!address || !hasVSWinner(vs)) {
    return false;
  }

  const involved = isSameAddress(vs.creator, address) || didUserChallengeVS(vs, address);
  if (!involved) {
    return false;
  }

  return !didUserWinVS(vs, address);
}

export function getVSUserWinAmount(vs: VSData, address?: string | null) {
  if (!didUserWinVS(vs, address)) {
    return 0;
  }

  if (vs.winner_side === "creator") {
    return getVSTotalPot(vs);
  }

  if (vs.winner_side === "challengers") {
    return getVSSingleWinnerPayout(vs);
  }

  return getVSTotalPot(vs);
}

export function mapClaimToVS(rawClaim: ClaimData): VSData {
  const claim = normalizeClaimData(rawClaim);
  const firstChallenger = claim.first_challenger ?? ZERO_ADDRESS;
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
  const txHash =
    typeof window !== "undefined" && (window as any).ethereum
      ? await sendBrowserWriteTransaction(wallet, functionName, args, value)
      : await sendRpcWriteTransaction(wallet, functionName, args, value);

  const receiptClient = createGenlayerClient();
  const receipt = await receiptClient.waitForTransactionReceipt({
    hash: txHash,
    status: "ACCEPTED" as any,
    retries: 200,
    interval: 5000,
  });

  return { txHash, receipt } satisfies ContractWriteResult;
}

function makeCalldataObject(functionName: string, args: unknown[]) {
  const payload: Record<string, unknown> = { method: functionName };
  if (args.length > 0) {
    payload.args = args;
  }
  return payload;
}

function encodeGenlayerWrite(functionName: string, args: unknown[]) {
  const encodedCall = genlayerAbi.calldata.encode(
    makeCalldataObject(functionName, args) as any
  );
  return genlayerAbi.transactions.serialize([encodedCall, false]);
}

async function sendRpcWriteTransaction(
  wallet: string,
  functionName: string,
  args: unknown[],
  value: number
) {
  const client = createGenlayerClient(wallet);
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as any,
    value: BigInt(value),
  });
}

async function sendBrowserWriteTransaction(
  wallet: string,
  functionName: string,
  args: unknown[],
  value: number
) {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error("Browser wallet not available");
  }

  await ensureGenlayerWalletChain(ethereum);

  const encodedTx = encodeGenlayerWrite(functionName, args);
  const data = encodeFunctionData({
    abi: GENLAYER_CONSENSUS_MAIN_ABI as any,
    functionName: "addTransaction",
    args: [
      wallet,
      CONTRACT_ADDRESS,
      BigInt(3),
      BigInt(3),
      encodedTx,
    ],
  });

  return (await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: wallet,
        to: getConsensusMainContractAddress(),
        data,
        value: toHex(BigInt(value)),
      },
    ],
  })) as string;
}

async function inferCreatedClaimId(wallet: string) {
  const userClaims = await getUserClaims(wallet);
  if (userClaims.length > 0) {
    return Math.max(...userClaims);
  }

  const claimCount = await getClaimCount();
  return claimCount > 0 ? claimCount : null;
}

async function readApiJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function readContractValue<T>(functionName: string, args: unknown[]): Promise<T> {
  const client = createGenlayerClient();
  return (await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as any,
  })) as unknown as T;
}

export async function getClaim(claimId: number): Promise<ClaimData | null> {
  try {
    const claim = await readContractValue<ClaimData>("get_claim", [claimId]);
    return normalizeClaimData(claim);
  } catch {
    return null;
  }
}

export async function getClaimWithAccess(
  claimId: number,
  inviteKey: string
): Promise<ClaimData | null> {
  try {
    const claim = await readContractValue<ClaimData>("get_claim_with_access", [
      claimId,
      inviteKey,
    ]);
    return normalizeClaimData(claim);
  } catch {
    return null;
  }
}

export async function getClaimSummary(claimId: number): Promise<ClaimData | null> {
  try {
    const claim = await readContractValue<ClaimData>("get_claim_summary", [claimId]);
    return normalizeClaimData(claim);
  } catch {
    return getClaim(claimId);
  }
}

export async function getClaimSummaryWithAccess(
  claimId: number,
  inviteKey: string
): Promise<ClaimData | null> {
  try {
    const claim = await readContractValue<ClaimData>(
      "get_claim_summary_with_access",
      [claimId, inviteKey]
    );
    return normalizeClaimData(claim);
  } catch {
    return getClaimWithAccess(claimId, inviteKey);
  }
}

export async function getClaimSummaries(
  startId = 1,
  limit = 50
): Promise<ClaimData[]> {
  try {
    const claims = await readContractValue<ClaimData[]>("get_claim_summaries", [
      startId,
      limit,
    ]);
    return claims.map(normalizeClaimData);
  } catch {
    const count = await getClaimCount();
    if (count <= 0 || startId > count || limit <= 0) {
      return [];
    }

    const end = Math.min(count, startId + limit - 1);
    const claims = await Promise.all(
      Array.from({ length: end - startId + 1 }, (_, index) =>
        getClaim(startId + index)
      )
    );

    return claims.filter((claim): claim is ClaimData => claim !== null);
  }
}

export async function getClaimCount(): Promise<number> {
  try {
    return await readContractValue<number>("get_claim_count", []);
  } catch {
    return 0;
  }
}

export async function getUserClaims(address: string): Promise<number[]> {
  try {
    return await readContractValue<number[]>("get_user_claims", [address]);
  } catch {
    return [];
  }
}

export async function getOpenClaims(): Promise<number[]> {
  try {
    return await readContractValue<number[]>("get_open_claims", []);
  } catch {
    return [];
  }
}

export async function getRivalryChain(claimId: number): Promise<number[]> {
  try {
    return await readContractValue<number[]>("get_rivalry_chain", [claimId]);
  } catch {
    return [];
  }
}

export async function getUserClaimSummaries(address: string): Promise<ClaimData[]> {
  try {
    const claims = await readContractValue<ClaimData[]>("get_user_claim_summaries", [
      address,
    ]);
    return claims.map(normalizeClaimData);
  } catch {
    const ids = await getUserClaims(address);
    const claims = await Promise.all(ids.map((id) => getClaim(id)));
    return claims.filter((claim): claim is ClaimData => claim !== null);
  }
}

export async function getOpenClaimSummaries(): Promise<ClaimData[]> {
  try {
    const claims = await readContractValue<ClaimData[]>("get_open_claim_summaries", []);
    return claims.map(normalizeClaimData);
  } catch {
    const ids = await getOpenClaims();
    const claims = await Promise.all(ids.map((id) => getClaim(id)));
    return claims.filter((claim): claim is ClaimData => claim !== null);
  }
}

export async function getVSSummaries(
  startId = 1,
  limit = 50
): Promise<VSData[]> {
  const claims = await getClaimSummaries(startId, limit);
  return claims.map(mapClaimToVS);
}

export async function getOpenVSSummaries(): Promise<VSData[]> {
  const claims = await getOpenClaimSummaries();
  return claims.map(mapClaimToVS);
}

export async function getUserVSSummaries(address: string): Promise<VSData[]> {
  const claims = await getUserClaimSummaries(address);
  return claims.map(mapClaimToVS);
}

export async function getUserVSDirect(address: string): Promise<VSData[]> {
  const results = await getUserVSSummaries(address);
  return results.sort((a, b) => b.id - a.id);
}

export async function createClaim(wallet: string, params: CreateClaimParams): Promise<ClaimWriteResult> {
  const writeResult = await writeAndWait(
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
      params.visibility ?? "public",
      params.invite_key ?? "",
    ],
    params.stake_amount
  );
  const claimId = await inferCreatedClaimId(wallet);
  return {
    ...writeResult,
    claimId,
  };
}

export async function createRematch(
  wallet: string,
  parentId: number,
  params: Omit<CreateClaimParams, "parent_id">
): Promise<ClaimWriteResult> {
  const writeResult = await writeAndWait(
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
      params.visibility ?? "public",
      params.invite_key ?? "",
    ],
    params.stake_amount
  );
  const claimId = await inferCreatedClaimId(wallet);
  return {
    ...writeResult,
    claimId,
  };
}

export async function challengeClaim(
  wallet: string,
  claimId: number,
  stakeAmount: number,
  inviteKey = ""
) {
  return writeAndWait(
    "challenge_claim",
    wallet,
    [claimId, stakeAmount, inviteKey],
    stakeAmount
  );
}

export async function resolveClaim(wallet: string, claimId: number) {
  return writeAndWait("resolve_claim", wallet, [claimId], 0);
}

export async function cancelClaim(wallet: string, claimId: number) {
  return writeAndWait("cancel_claim", wallet, [claimId], 0);
}

export async function getVS(
  vsId: number,
  options: {
    inviteKey?: string | null;
    viewerAddress?: string | null;
  } = {}
): Promise<VSData | null> {
  const inviteKey = options.inviteKey?.trim() ?? "";

  if (typeof window !== "undefined") {
    const path = inviteKey
      ? `/api/vs/${vsId}?invite=${encodeURIComponent(inviteKey)}`
      : `/api/vs/${vsId}`;
    const response = await readApiJson<{ item: VSData }>(path);
    if (response?.item) {
      return response.item;
    }

    if (inviteKey) {
      const inviteClaim = await getClaimWithAccess(vsId, inviteKey);
      if (inviteClaim) {
        return mapClaimToVS(inviteClaim);
      }
    }

    if (options.viewerAddress) {
      const userItems = await getUserVSDirect(options.viewerAddress);
      const found = userItems.find((item) => item.id === vsId);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (inviteKey) {
    const inviteClaim = await getClaimWithAccess(vsId, inviteKey);
    return inviteClaim ? mapClaimToVS(inviteClaim) : null;
  }

  const claim = await getClaim(vsId);
  return claim ? mapClaimToVS(claim) : null;
}

export async function getVSWithAccess(vsId: number, inviteKey: string) {
  const claim = await getClaimWithAccess(vsId, inviteKey);
  return claim ? mapClaimToVS(claim) : null;
}

export async function getVSCount(): Promise<number> {
  return getClaimCount();
}

export async function getUserVSList(address: string): Promise<number[]> {
  return getUserClaims(address);
}

export async function getAllVSFast(): Promise<VSData[]> {
  if (typeof window !== "undefined") {
    const response = await readApiJson<{ items: VSData[] }>("/api/vs");
    return response?.items ?? [];
  }

  const count = await getVSCount();
  if (count <= 0) {
    return [];
  }

  const pageSize = 50;
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / pageSize) }, (_, index) =>
      getVSSummaries(index * pageSize + 1, pageSize)
    )
  );
  const results = pages.flat();

  return results.sort((a, b) => b.id - a.id);
}

export async function getUserVSFast(address: string): Promise<VSData[]> {
  if (typeof window !== "undefined") {
    const response = await readApiJson<{ items: VSData[] }>(
      `/api/vs/user/${encodeURIComponent(address)}`
    );
    return response?.items ?? [];
  }

  const results = await getUserVSSummaries(address);
  return results.sort((a, b) => b.id - a.id);
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
    visibility: "public",
  });
}

export async function acceptVS(
  wallet: string,
  vsId: number,
  stakeAmount: number,
  inviteKey = ""
) {
  return challengeClaim(wallet, vsId, stakeAmount, inviteKey);
}

export async function resolveVS(wallet: string, vsId: number) {
  return resolveClaim(wallet, vsId);
}

export async function cancelVS(wallet: string, vsId: number) {
  return cancelClaim(wallet, vsId);
}
