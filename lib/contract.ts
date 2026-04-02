import { abi as genlayerAbi } from "genlayer-js";
import { encodeFunctionData, parseEventLogs, createPublicClient, http } from "viem";
import type { VSCacheFreshness } from "./vs-freshness";

import {
  createGenlayerClient,
  ensureGenlayerWalletChain,
  getEndpoint,
  getConfiguredNetworkAlias,
  getGenlayerChain,
  getConsensusMainContractAddress,
  GENLAYER_CONSENSUS_MAIN_ABI,
} from "./genlayer";
import { normalizeCategoryId } from "./constants";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as any;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const GEN_UNIT = BigInt("1000000000000000000");

function genToWei(gen: number): bigint {
  if (!Number.isFinite(gen) || gen < 0) {
    throw new Error("Invalid GEN amount");
  }
  if (!Number.isInteger(gen)) {
    throw new Error("GEN amounts must be whole numbers");
  }
  return BigInt(gen) * GEN_UNIT;
}

function normalizeWriteValueForNetwork(value: bigint): bigint {
  const network = getConfiguredNetworkAlias();

  // Studio does not support native token transfers, so keep stakes logical-only there.
  if (network === "studionet" || network === "localnet") {
    return BigInt(0);
  }

  return value;
}

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
  winner_side: "creator" | "challengers" | "draw" | "";
  resolution_summary: string;
  confidence: number;
  resolve_attempts?: number;
  category: string;
  parent_id: number;
  challenger_count: number;
  market_type: string;
  odds_mode: string;
  challenger_payout_bps: number;
  handicap_line: string;
  settlement_rule: string;
  max_challengers: number;
  created_at?: number;
  visibility?: "public" | "private";
  is_private?: boolean;
  creator_requested_resolve?: boolean;
  challenger_requested_resolve?: boolean;
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
  created_at?: number;
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
  resolve_attempts?: number;
  creator_requested_resolve?: boolean;
  challenger_requested_resolve?: boolean;
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
  explorerTxHash?: string;
  receipt: unknown;
}

export interface ClaimWriteResult extends ContractWriteResult {
  claimId: number | null;
  pending?: boolean;
  actor?: string;
}

export interface VSFeedSnapshot {
  items: VSData[];
  cache: VSCacheFreshness | null;
}

export interface VSDetailSnapshot {
  item: VSData | null;
  cache: VSCacheFreshness | null;
}

function normalizeClaimData(claim: ClaimData): ClaimData {
  const challengerAddresses =
    claim.challenger_addresses ?? claim.challengers?.map((challenger) => challenger.address) ?? [];
  const winnerSide =
    claim.winner_side === "creator" ||
    claim.winner_side === "challengers" ||
    claim.winner_side === "draw"
      ? claim.winner_side
      : "";

  return {
    ...claim,
    category: normalizeCategoryId(claim.category),
    winner_side: winnerSide,
    resolve_attempts: claim.resolve_attempts ?? 0,
    creator_requested_resolve: Boolean(claim.creator_requested_resolve),
    challenger_requested_resolve: Boolean(claim.challenger_requested_resolve),
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

function extractGenlayerTxIdFromLogs(logs: unknown[]): string | null {
  // Studio and newer networks emit NewTransaction(bytes32,address,address).
  const NEW_TX_ABI = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "bytes32", name: "txId", type: "bytes32" },
        { indexed: true, internalType: "address", name: "recipient", type: "address" },
        { indexed: true, internalType: "address", name: "activator", type: "address" },
      ],
      name: "NewTransaction",
      type: "event",
    },
  ] as const;

  const newTransactionEvents = parseEventLogs({
    abi: NEW_TX_ABI,
    eventName: "NewTransaction",
    logs: logs as any,
  });

  if (newTransactionEvents.length > 0 && (newTransactionEvents[0] as any).args?.txId) {
    return (newTransactionEvents[0] as any).args.txId as string;
  }

  // Bradbury also emits CreatedTransaction(bytes32,uint256).
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
    logs: logs as any,
  });

  if (events.length > 0 && (events[0] as any).args?.txId) {
    return (events[0] as any).args.txId as string;
  }

  const consensusMain = getConsensusMainContractAddress().toLowerCase();
  const isHex32 = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value);
  const isZero = (value: string) => /^0x0{64}$/i.test(value);
  const isPaddedAddress = (value: string) =>
    /^0x0{24}[0-9a-fA-F]{40}$/i.test(value);
  const isTxIdCandidate = (value: string) =>
    isHex32(value) && !isZero(value) && !isPaddedAddress(value);

  for (const rawLog of logs as any[]) {
    const logAddress = String(rawLog?.address ?? "").toLowerCase();
    const topics = Array.isArray(rawLog?.topics) ? rawLog.topics : [];
    if (logAddress !== consensusMain || topics.length < 2) {
      continue;
    }

    const candidate = String(topics[1] ?? "");
    if (isTxIdCandidate(candidate)) {
      return candidate;
    }
  }

  const counts = new Map<string, number>();
  for (const rawLog of logs as any[]) {
    const topics = Array.isArray(rawLog?.topics) ? rawLog.topics : [];
    for (const topic of topics.slice(1)) {
      const candidate = String(topic ?? "");
      if (!isTxIdCandidate(candidate)) {
        continue;
      }
      counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
    }
  }

  let bestCandidate: string | null = null;
  let bestCount = 1;
  counts.forEach((count, candidate) => {
    if (count > bestCount) {
      bestCandidate = candidate;
      bestCount = count;
    }
  });

  if (bestCandidate) {
    return bestCandidate;
  }

  return null;
}

function getConsensusAddTransactionArgs(wallet: string, functionName: string, args: unknown[]) {
  const chain = getGenlayerChain() as {
    defaultConsensusMaxRotations?: number;
    defaultNumberOfInitialValidators?: number;
  };
  const calldata = buildConsensusTransactionData(functionName, args);
  const addTransactionInput = (GENLAYER_CONSENSUS_MAIN_ABI as any[]).find(
    (entry) => entry?.type === "function" && entry?.name === "addTransaction"
  ) as { inputs?: Array<{ name?: string; type?: string }> } | undefined;
  const inputCount = Array.isArray(addTransactionInput?.inputs)
    ? addTransactionInput.inputs.length
    : 0;

  const baseArgs = [
    wallet,
    CONTRACT_ADDRESS,
    BigInt(chain.defaultNumberOfInitialValidators ?? 5),
    BigInt(chain.defaultConsensusMaxRotations ?? 3),
    calldata,
  ];

  if (inputCount >= 6) {
    return [...baseArgs, BigInt(0)];
  }

  return baseArgs;
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

  const txId = extractGenlayerTxIdFromLogs(evmReceipt.logs);
  if (txId) {
    return txId;
  }

  return evmTxHash;
}

function makeContractFreshness(): VSCacheFreshness {
  return {
    source: "contract",
    status: "live",
    lastUpdatedAt: new Date().toISOString(),
    ageMs: 0,
    freshnessWindowMs: 1,
  };
}

function buildConsensusTransactionData(functionName: string, args: unknown[]) {
  const callData = genlayerAbi.calldata.encode(
    genlayerAbi.calldata.makeCalldataObject(functionName, args as any, undefined)
  );

  return genlayerAbi.transactions.serialize([callData, false]);
}

async function sendBrowserWriteTransaction(
  wallet: string,
  functionName: string,
  args: unknown[],
  value: bigint
) {
  const ethereum =
    typeof window !== "undefined" ? (window as any).ethereum : undefined;

  if (!ethereum) {
    throw new Error("No injected wallet available");
  }

  await ensureGenlayerWalletChain(ethereum);

  const txRequest: Record<string, string> = {
    from: wallet,
    to: getConsensusMainContractAddress(),
    data: encodeFunctionData({
      abi: GENLAYER_CONSENSUS_MAIN_ABI as any,
      functionName: "addTransaction",
      args: getConsensusAddTransactionArgs(wallet, functionName, args) as any,
    }),
    value: `0x${value.toString(16)}`,
  };

  try {
    const gas = await ethereum.request({
      method: "eth_estimateGas",
      params: [txRequest],
    });
    if (typeof gas === "string") {
      txRequest.gas = gas;
    }
  } catch {
    // Let the wallet estimate gas if the RPC estimate is unavailable.
  }

  try {
    const gasPrice = await ethereum.request({
      method: "eth_gasPrice",
    });
    if (typeof gasPrice === "string") {
      txRequest.type = "0x0";
      txRequest.gasPrice = gasPrice;
    }
  } catch {
    // Some wallet providers will populate pricing fields automatically.
  }

  const evmTxHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [txRequest],
  });

  if (typeof evmTxHash !== "string") {
    throw new Error("Wallet did not return a transaction hash");
  }

  return evmTxHash;
}

export async function finalizeGenlayerTx(
  genlayerTxId: string,
  wallet: string
): Promise<string> {
  const ethereum =
    typeof window !== "undefined" ? (window as any).ethereum : undefined;

  if (!ethereum) {
    throw new Error("No injected wallet available");
  }

  await ensureGenlayerWalletChain(ethereum);

  const txRequest: Record<string, string> = {
    from: wallet,
    to: getConsensusMainContractAddress(),
    data: encodeFunctionData({
      abi: GENLAYER_CONSENSUS_MAIN_ABI as any,
      functionName: "finalizeTransaction",
      args: [genlayerTxId as `0x${string}`],
    }),
    value: "0x0",
  };

  try {
    const gas = await ethereum.request({
      method: "eth_estimateGas",
      params: [txRequest],
    });
    if (typeof gas === "string") {
      txRequest.gas = gas;
    }
  } catch {
    // Let the wallet estimate gas if the RPC estimate is unavailable.
  }

  try {
    const gasPrice = await ethereum.request({
      method: "eth_gasPrice",
    });
    if (typeof gasPrice === "string") {
      txRequest.type = "0x0";
      txRequest.gasPrice = gasPrice;
    }
  } catch {
    // Some wallet providers will populate pricing fields automatically.
  }

  const evmTxHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [txRequest],
  });

  if (typeof evmTxHash !== "string") {
    throw new Error("Wallet did not return a transaction hash");
  }

  return evmTxHash;
}

async function writeAndWait(
  functionName: string,
  wallet: string,
  args: unknown[],
  value: bigint
): Promise<ContractWriteResult & { pending?: boolean }> {
  const runtimeValue = normalizeWriteValueForNetwork(value);
  const isBrowser =
    typeof window !== "undefined" && !!(window as any).ethereum;

  const evmTxHash = isBrowser
    ? await sendBrowserWriteTransaction(wallet, functionName, args, runtimeValue)
    : await sendRpcWriteTransaction(wallet, functionName, args, runtimeValue);

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
      const explorerTxHash =
        extractGenlayerTxIdFromLogs(evmReceipt?.logs ?? []) || evmTxHash;
      return { txHash: evmTxHash, explorerTxHash, receipt: null, pending: true };
    } catch (err: any) {
      if (err?.message === "Transaction reverted on-chain") throw err;
      // timeout / RPC hiccup – tx was already submitted via MetaMask
    }

    return { txHash: evmTxHash, explorerTxHash: evmTxHash, receipt: null, pending: true };
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
    return { txHash: evmTxHash, explorerTxHash: genlayerTxId, receipt };
  } catch {
    const explorerTxHash = await extractGenlayerTxId(evmTxHash).catch(() => evmTxHash);
    return { txHash: evmTxHash, explorerTxHash, receipt: null, pending: true };
  }
}

async function sendRpcWriteTransaction(
  wallet: string,
  functionName: string,
  args: unknown[],
  value: bigint
) {
  const client = createGenlayerClient(wallet);
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as any,
    value,
  });
}

async function inferCreatedClaimId(wallet: string) {
  const userClaims = await getUserClaims(wallet);
  if (userClaims.length > 0) {
    return Math.max(...userClaims);
  }

  const claimCount = await getClaimCount();
  return claimCount > 0 ? claimCount : null;
}

async function readApiJson<T>(
  path: string,
  options?: {
    timeoutMs?: number;
  }
): Promise<T | null> {
  try {
    const response = await fetch(path, {
      signal:
        typeof options?.timeoutMs === "number"
          ? AbortSignal.timeout(options.timeoutMs)
          : undefined,
    });
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

async function getAllClaimSummaries(pageSize = 50): Promise<ClaimData[]> {
  const count = await getClaimCount();
  if (count <= 0) {
    return [];
  }

  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / pageSize) }, (_, index) =>
      getClaimSummaries(index * pageSize + 1, pageSize)
    )
  );

  return pages.flat();
}

export async function getUserClaims(address: string): Promise<number[]> {
  const claims = await getUserClaimSummaries(address);
  return claims.map((claim) => claim.id);
}

export async function getOpenClaims(): Promise<number[]> {
  const claims = await getOpenClaimSummaries();
  return claims.map((claim) => claim.id);
}

export async function getRivalryChain(claimId: number): Promise<number[]> {
  const allClaims = await getAllClaimSummaries();
  const byId = new Map(allClaims.map((claim) => [claim.id, claim]));
  const seedClaim = byId.get(claimId) ?? (await getClaim(claimId));
  if (!seedClaim) {
    return [];
  }

  byId.set(seedClaim.id, seedClaim);

  let rootId = seedClaim.id;
  let parentId = seedClaim.parent_id;
  const visited = new Set<number>([seedClaim.id]);

  while (parentId > 0 && !visited.has(parentId)) {
    const parentClaim = byId.get(parentId) ?? (await getClaim(parentId));
    if (!parentClaim) {
      break;
    }

    byId.set(parentClaim.id, parentClaim);
    visited.add(parentClaim.id);
    rootId = parentClaim.id;
    parentId = parentClaim.parent_id;
  }

  const childrenByParent = new Map<number, number[]>();
  for (const claim of Array.from(byId.values())) {
    if (claim.parent_id <= 0) {
      continue;
    }

    const siblings = childrenByParent.get(claim.parent_id) ?? [];
    siblings.push(claim.id);
    childrenByParent.set(claim.parent_id, siblings);
  }

  const chain = [rootId];
  const chainedIds = new Set(chain);
  let cursor = rootId;

  while (true) {
    const nextId = (childrenByParent.get(cursor) ?? [])
      .filter((id) => !chainedIds.has(id))
      .sort((a, b) => a - b)[0];

    if (!nextId) {
      break;
    }

    chain.push(nextId);
    chainedIds.add(nextId);
    cursor = nextId;
  }

  return chain;
}

export async function getUserClaimSummaries(address: string): Promise<ClaimData[]> {
  const allSummaries = await getAllClaimSummaries();
  if (allSummaries.length === 0) {
    return [];
  }

  const creatorClaims = allSummaries.filter((claim) => isSameAddress(claim.creator, address));
  const challengerCandidates = allSummaries.filter(
    (claim) => claim.challenger_count > 0 && !isSameAddress(claim.creator, address)
  );

  const challengerClaims = challengerCandidates.length
    ? await Promise.all(challengerCandidates.map((claim) => getClaim(claim.id)))
    : [];

  const challengerMatches = challengerClaims.filter((claim): claim is ClaimData => {
    if (!claim) {
      return false;
    }

    return (claim.challenger_addresses ?? []).some((entry) => isSameAddress(entry, address));
  });

  const merged = new Map<number, ClaimData>();
  for (const claim of creatorClaims) {
    merged.set(claim.id, claim);
  }
  for (const claim of challengerMatches) {
    merged.set(claim.id, claim);
  }

  return Array.from(merged.values()).sort((a, b) => b.id - a.id);
}

export async function getOpenClaimSummaries(): Promise<ClaimData[]> {
  const allClaims = await getAllClaimSummaries();
  return allClaims
    .filter((claim) => claim.state === "open" || claim.state === "active")
    .sort((a, b) => b.id - a.id);
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
  const stakeWei = genToWei(params.stake_amount);

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
    stakeWei
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
  const stakeWei = genToWei(params.stake_amount);

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
    stakeWei
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
  const stakeWei = genToWei(stakeAmount);
  const result = await writeAndWait(
    "challenge_claim",
    wallet,
    [claimId, stakeAmount, inviteKey],
    stakeWei
  );

  void requestIndexedClaimRefresh(claimId, inviteKey);

  return result;
}

export async function resolveClaim(
  wallet: string,
  claimId: number,
  inviteKey = ""
) {
  const result = await writeAndWait("request_resolve", wallet, [claimId], BigInt(0));
  void requestIndexedClaimRefresh(claimId, inviteKey);
  return result;
}

export async function requestResolveClaim(
  wallet: string,
  claimId: number,
  inviteKey = ""
) {
  return resolveClaim(wallet, claimId, inviteKey);
}

export async function resetResolveRequest(
  wallet: string,
  claimId: number,
  inviteKey = ""
) {
  const result = await writeAndWait(
    "reset_resolve_request",
    wallet,
    [claimId],
    BigInt(0)
  );
  void requestIndexedClaimRefresh(claimId, inviteKey);
  return result;
}

export async function cancelClaim(
  wallet: string,
  claimId: number,
  inviteKey = ""
) {
  const result = await writeAndWait("cancel_claim", wallet, [claimId], BigInt(0));
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
  const snapshot = await getVSSnapshot(vsId, options);
  return snapshot.item;
}

export async function getVSSnapshot(
  vsId: number,
  options: {
    inviteKey?: string | null;
    viewerAddress?: string | null;
  } = {}
): Promise<VSDetailSnapshot> {
  const inviteKey = options.inviteKey?.trim() ?? "";

  if (typeof window !== "undefined") {
    const path = inviteKey
      ? `/api/vs/${vsId}?invite=${encodeURIComponent(inviteKey)}`
      : `/api/vs/${vsId}`;
    const response = await readApiJson<{ item: VSData; cache?: VSCacheFreshness | null }>(path);
    if (response?.item) {
      return {
        item: response.item,
        cache: response.cache ?? null,
      };
    }

    if (inviteKey) {
      const inviteClaim = await getClaimWithAccess(vsId, inviteKey);
      if (inviteClaim) {
        return {
          item: mapClaimToVS(inviteClaim),
          cache: makeContractFreshness(),
        };
      }
    }

    const directClaim = await getClaim(vsId);
    if (directClaim) {
      return {
        item: mapClaimToVS(directClaim),
        cache: makeContractFreshness(),
      };
    }

    if (options.viewerAddress) {
      const userItems = await getUserVSDirect(options.viewerAddress);
      const found = userItems.find((item) => item.id === vsId);
      if (found) {
        return {
          item: found,
          cache: null,
        };
      }
    }

    return {
      item: null,
      cache: null,
    };
  }

  if (inviteKey) {
    const inviteClaim = await getClaimWithAccess(vsId, inviteKey);
    return {
      item: inviteClaim ? mapClaimToVS(inviteClaim) : null,
      cache: inviteClaim ? makeContractFreshness() : null,
    };
  }

  const claim = await getClaim(vsId);
  return {
    item: claim ? mapClaimToVS(claim) : null,
    cache: claim ? makeContractFreshness() : null,
  };
}

export async function getAllVSFast(): Promise<VSData[]> {
  const snapshot = await getAllVSSnapshot();
  return snapshot.items;
}

export async function getAllVSSnapshot(options: {
  forceRefresh?: boolean;
} = {}): Promise<VSFeedSnapshot> {
  if (typeof window !== "undefined") {
    const path = options.forceRefresh ? "/api/vs?refresh=1" : "/api/vs";
    let response = await readApiJson<{
      items: VSData[];
      cache?: VSCacheFreshness | null;
    }>(path, options.forceRefresh ? { timeoutMs: 12_000 } : undefined);

    if (!response && options.forceRefresh) {
      response = await readApiJson<{
        items: VSData[];
        cache?: VSCacheFreshness | null;
      }>("/api/vs");
    }

    return {
      items: response?.items ?? [],
      cache: response?.cache ?? null,
    };
  }

  const count = await getClaimCount();
  if (count <= 0) {
    return {
      items: [],
      cache: makeContractFreshness(),
    };
  }

  const pageSize = 50;
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(count / pageSize) }, (_, index) =>
      getVSSummaries(index * pageSize + 1, pageSize)
    )
  );
  const results = pages.flat();

  return {
    items: results.sort((a, b) => b.id - a.id),
    cache: makeContractFreshness(),
  };
}

export async function getUserVSFast(address: string): Promise<VSData[]> {
  const snapshot = await getUserVSSnapshot(address);
  return snapshot.items;
}

export async function getUserVSSnapshot(
  address: string,
  options: {
    forceRefresh?: boolean;
  } = {}
): Promise<VSFeedSnapshot> {
  if (typeof window !== "undefined") {
    const path = options.forceRefresh
      ? `/api/vs/user/${encodeURIComponent(address)}?refresh=1`
      : `/api/vs/user/${encodeURIComponent(address)}`;
    let response = await readApiJson<{
      items: VSData[];
      cache?: VSCacheFreshness | null;
    }>(path, options.forceRefresh ? { timeoutMs: 12_000 } : undefined);

    if (!response && options.forceRefresh) {
      response = await readApiJson<{
        items: VSData[];
        cache?: VSCacheFreshness | null;
      }>(`/api/vs/user/${encodeURIComponent(address)}`);
    }

    return {
      items: response?.items ?? [],
      cache: response?.cache ?? null,
    };
  }

  const results = await getUserVSSummaries(address);
  return {
    items: results.sort((a, b) => b.id - a.id),
    cache: makeContractFreshness(),
  };
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

export async function requestResolveVS(wallet: string, vsId: number, inviteKey = "") {
  return requestResolveClaim(wallet, vsId, inviteKey);
}

export async function resetVSResolveRequest(wallet: string, vsId: number, inviteKey = "") {
  return resetResolveRequest(wallet, vsId, inviteKey);
}

export async function cancelVS(wallet: string, vsId: number, inviteKey = "") {
  return cancelClaim(wallet, vsId, inviteKey);
}
