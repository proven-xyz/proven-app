import { abi as genlayerAbi } from "genlayer-js";
import { encodeFunctionData, toHex, parseEventLogs, createPublicClient, http } from "viem";

import {
  createGenlayerClient,
  ensureGenlayerWalletChain,
  GENLAYER_CONSENSUS_MAIN_ABI,
  getEndpoint,
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
  pending?: boolean;
  actor?: string;
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

async function extractGenlayerTxId(evmTxHash: string): Promise<string> {
  const endpoint = getEndpoint();
  const rpcUrl = endpoint || "https://rpc-bradbury.genlayer.com";

  const viemClient = createPublicClient({
    transport: http(rpcUrl),
  });

  const evmReceipt = await viemClient.waitForTransactionReceipt({
    hash: evmTxHash as `0x${string}`,
  });

  if (evmReceipt.status === "reverted") {
    throw new Error("Transaction reverted on-chain");
  }

  // Bradbury emits CreatedTransaction(bytes32,uint256), not NewTransaction
  const CREATED_TX_ABI = [
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

  const events = parseEventLogs({
    abi: CREATED_TX_ABI,
    eventName: "CreatedTransaction",
    logs: evmReceipt.logs,
  });

  if (events.length > 0 && (events[0] as any).args?.txId) {
    return (events[0] as any).args.txId as string;
  }

  return evmTxHash;
}

async function writeAndWait(
  functionName: string,
  wallet: string,
  args: unknown[],
  value: number
): Promise<ContractWriteResult & { pending?: boolean }> {
  const isBrowser =
    typeof window !== "undefined" && !!(window as any).ethereum;

  const evmTxHash = isBrowser
    ? await sendBrowserWriteTransaction(wallet, functionName, args, value)
    : await sendRpcWriteTransaction(wallet, functionName, args, value);

  // --- browser (MetaMask) path: confirm at EVM level, skip consensus poll ---
  if (isBrowser) {
    try {
      const rpcUrl = getEndpoint() || "https://rpc-bradbury.genlayer.com";
      const viemClient = createPublicClient({ transport: http(rpcUrl) });

      const evmReceipt = (await Promise.race([
        viemClient.waitForTransactionReceipt({
          hash: evmTxHash as `0x${string}`,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("evm-timeout")), 20_000)
        ),
      ])) as any;

      if (evmReceipt?.status === "reverted") {
        throw new Error("Transaction reverted on-chain");
      }
    } catch (err: any) {
      if (err?.message === "Transaction reverted on-chain") throw err;
      // timeout / RPC hiccup – tx was already submitted via MetaMask
    }

    return { txHash: evmTxHash, receipt: null, pending: true };
  }

  // --- SDK / server-key path: try the full consensus wait with a safety cap ---
  try {
    const genlayerTxId = await extractGenlayerTxId(evmTxHash);
    const receiptClient = createGenlayerClient();
    const receipt = await Promise.race([
      receiptClient.waitForTransactionReceipt({
        hash: genlayerTxId as any,
        status: "ACCEPTED" as any,
        retries: 200,
        interval: 5000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("consensus-timeout")), 60_000)
      ),
    ]);
    return { txHash: evmTxHash, receipt };
  } catch {
    return { txHash: evmTxHash, receipt: null, pending: true };
  }
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

async function requestGenlayerRpc<T>(method: string, params: unknown[]) {
  const endpoint = getEndpoint();
  if (!endpoint) {
    throw new Error("GenLayer RPC endpoint is not configured");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(payload.error.message || `GenLayer RPC ${method} failed`);
  }

  return payload.result as T;
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
  const [nonce, gasPrice] = await Promise.all([
    requestGenlayerRpc<string>("eth_getTransactionCount", [wallet, "pending"]),
    requestGenlayerRpc<string>("eth_gasPrice", []),
  ]);

  const data = encodeFunctionData({
    abi: GENLAYER_CONSENSUS_MAIN_ABI as any,
    functionName: "addTransaction",
    args: [
      wallet,
      CONTRACT_ADDRESS,
      BigInt(3),
      BigInt(3),
      encodedTx,
      BigInt(0),
    ],
  });

  return (await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: wallet,
        to: getConsensusMainContractAddress(),
        data,
        type: "0x0",
        nonce,
        gasPrice,
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

async function requestIndexedClaimRefresh(
  claimId: number,
  inviteKey = ""
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/vs/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        claimId,
        inviteKey,
      }),
    });
  } catch {
    // Read freshness degrades gracefully through sync-on-read and the cache fallback.
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
  // Capture current count before submitting so we can predict the new ID
  // even when consensus hasn't finalised yet (pending writes).
  const countBefore = await getClaimCount();

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

  // For pending writes the contract state hasn't updated yet,
  // so infer the ID optimistically from the pre-submit count.
  const claimId = (writeResult as any).pending
    ? countBefore + 1
    : await inferCreatedClaimId(wallet);

  if (claimId) {
    void requestIndexedClaimRefresh(claimId, params.invite_key ?? "");
  }

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
  const countBefore = await getClaimCount();

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

  const claimId = (writeResult as any).pending
    ? countBefore + 1
    : await inferCreatedClaimId(wallet);

  if (claimId) {
    void requestIndexedClaimRefresh(claimId, params.invite_key ?? "");
  }

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
  const result = await writeAndWait(
    "challenge_claim",
    wallet,
    [claimId, stakeAmount, inviteKey],
    stakeAmount
  );

  void requestIndexedClaimRefresh(claimId, inviteKey);

  return result;
}

export async function resolveClaim(
  wallet: string,
  claimId: number,
  inviteKey = ""
) {
  const result = await writeAndWait("resolve_claim", wallet, [claimId], 0);
  void requestIndexedClaimRefresh(claimId, inviteKey);
  return result;
}

export async function cancelClaim(
  wallet: string,
  claimId: number,
  inviteKey = ""
) {
  const result = await writeAndWait("cancel_claim", wallet, [claimId], 0);
  void requestIndexedClaimRefresh(claimId, inviteKey);
  return result;
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

export async function getAllVSFast(): Promise<VSData[]> {
  if (typeof window !== "undefined") {
    const response = await readApiJson<{ items: VSData[] }>("/api/vs");
    return response?.items ?? [];
  }

  const count = await getClaimCount();
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

export async function acceptVS(
  wallet: string,
  vsId: number,
  stakeAmount: number,
  inviteKey = ""
) {
  return challengeClaim(wallet, vsId, stakeAmount, inviteKey);
}

export async function resolveVS(wallet: string, vsId: number, inviteKey = "") {
  return resolveClaim(wallet, vsId, inviteKey);
}

export async function cancelVS(wallet: string, vsId: number, inviteKey = "") {
  return cancelClaim(wallet, vsId, inviteKey);
}
