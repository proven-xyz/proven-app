import {
  getClaim,
  getClaimCount,
  getClaimSummaries,
  getClaimWithAccess,
  getOpenClaimSummaries,
  getUserClaimSummaries,
  mapClaimToVS,
  type ClaimChallenger,
  type ClaimData,
  type VSData,
} from "@/lib/contract";
import {
  getAllVSFast as getVsFeedFromCache,
  getUserVSFast as getUserVsFromCache,
  getVSByIdFast as getVsByIdFromCache,
  refreshVSIndex,
} from "@/lib/server/vs-cache";
import {
  getClaimById,
  getClaimsByChallenger,
  getClaimsByFilter,
  getChallengersByClaimId,
  getSyncMeta,
  setSyncMeta,
  upsertClaim,
  upsertClaimsBatch,
  upsertChallengers,
  type ChallengerRow,
  type ClaimRow,
} from "@/lib/db";

const LIST_FRESHNESS_MS = 60_000;
const DETAIL_FRESHNESS_MS = 15_000;
const CLAIM_SYNC_PAGE_SIZE = 50;
const POST_WRITE_REFRESH_ATTEMPTS = 5;
const POST_WRITE_REFRESH_DELAY_MS = 1_500;

type ReconcileResult = {
  synced: number;
  new: number;
  stateChanges: number;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPrivateClaim(claim: Pick<ClaimData, "visibility" | "is_private">) {
  return claim.visibility === "private" || Boolean(claim.is_private);
}

function sanitizeClaimForPublicRead(claim: ClaimData): ClaimData {
  if (!isPrivateClaim(claim)) {
    return claim;
  }

  return {
    ...claim,
    question: "",
    creator_position: "",
    counter_position: "",
    resolution_url: "",
    resolution_summary: "",
    handicap_line: "",
    settlement_rule: "",
  };
}

function isClaimFinal(state: string) {
  return state === "resolved" || state === "cancelled";
}

function isFresh(updatedAt: number, thresholdMs: number) {
  return Date.now() - updatedAt <= thresholdMs;
}

function challengerRowsToClaimChallengers(rows: ChallengerRow[]): ClaimChallenger[] {
  return rows.map((row) => ({
    address: row.address,
    stake: row.stake,
    potential_payout: row.potential_payout,
  }));
}

function claimRowToClaimData(
  row: ClaimRow,
  challengerRows: ChallengerRow[] = []
): ClaimData {
  const challengers = challengerRowsToClaimChallengers(challengerRows);
  const challengerAddresses =
    challengers.length > 0
      ? challengers.map((challenger) => challenger.address)
      : row.first_challenger
      ? [row.first_challenger]
      : [];

  return {
    id: row.id,
    creator: row.creator,
    question: row.question ?? "",
    creator_position: row.creator_position ?? "",
    counter_position: row.counter_position ?? "",
    resolution_url: row.resolution_url ?? "",
    creator_stake: row.creator_stake,
    total_challenger_stake: row.total_challenger_stake,
    reserved_creator_liability: row.reserved_creator_liability,
    available_creator_liability: Math.max(
      0,
      row.creator_stake - row.reserved_creator_liability
    ),
    deadline: row.deadline,
    state: row.state as ClaimData["state"],
    winner_side: row.winner_side as ClaimData["winner_side"],
    resolution_summary: row.resolution_summary ?? "",
    confidence: row.confidence,
    category: row.category,
    parent_id: row.parent_id,
    challenger_count: row.challenger_count,
    market_type: row.market_type,
    odds_mode: row.odds_mode,
    challenger_payout_bps: row.challenger_payout_bps,
    handicap_line: row.handicap_line ?? "",
    settlement_rule: row.settlement_rule ?? "",
    max_challengers: row.max_challengers,
    created_at: 0,
    visibility: row.visibility as ClaimData["visibility"],
    is_private: row.visibility === "private",
    challengers: challengers.length > 0 ? challengers : undefined,
    first_challenger: row.first_challenger,
    challenger_addresses: challengerAddresses,
    total_pot: row.total_pot,
  };
}

function claimRowToVSData(row: ClaimRow, challengerRows: ChallengerRow[] = []) {
  return mapClaimToVS(claimRowToClaimData(row, challengerRows));
}

async function persistIndexedClaim(claim: ClaimData) {
  await upsertClaim(claim);

  if (Array.isArray(claim.challengers)) {
    await upsertChallengers(claim.id, claim.challengers);
    return;
  }

  if (claim.challenger_count === 0) {
    await upsertChallengers(claim.id, []);
  }
}

async function persistIndexedClaims(claims: ClaimData[]) {
  if (claims.length === 0) {
    return;
  }

  await upsertClaimsBatch(claims);
  await Promise.all(
    claims
      .filter((claim) => claim.challenger_count === 0)
      .map((claim) => upsertChallengers(claim.id, []))
  );
}

async function loadStoredVsById(vsId: number) {
  const [row, challengerRows] = await Promise.all([
    getClaimById(vsId),
    getChallengersByClaimId(vsId),
  ]);

  return { row, challengerRows };
}

async function loadStoredUserVs(address: string) {
  const normalized = address.toLowerCase();
  const creatorRows = await getClaimsByFilter({
    creator: normalized,
    orderBy: "id_desc",
  });

  const challengerClaimIds = await getClaimsByChallenger(normalized);
  const creatorIds = new Set(creatorRows.map((row) => row.id));
  const otherIds = challengerClaimIds.filter((id) => !creatorIds.has(id));
  const otherRows =
    otherIds.length > 0
      ? await getClaimsByFilter({
          ids: otherIds,
          orderBy: "id_desc",
        })
      : [];

  const rows = [...creatorRows, ...otherRows].sort((a, b) => b.id - a.id);
  const withChallengers = await Promise.all(
    rows.map(async (row) => {
      const challengerRows = await getChallengersByClaimId(row.id);
      return {
        row,
        challengerRows,
        vs: claimRowToVSData(row, challengerRows),
      };
    })
  );

  return withChallengers;
}

async function fetchClaimForIndex(
  claimId: number,
  inviteKey?: string | null
): Promise<ClaimData | null> {
  if (inviteKey) {
    return getClaimWithAccess(claimId, inviteKey);
  }

  return getClaim(claimId);
}

async function hydrateUserClaimsFromContract(address: string) {
  const claims = await getUserClaimSummaries(address);
  if (claims.length === 0) {
    return [];
  }

  await persistIndexedClaims(claims);

  const publicClaimsNeedingDetails = claims.filter(
    (claim) => !isPrivateClaim(claim) && claim.challenger_count > 0
  );

  if (publicClaimsNeedingDetails.length > 0) {
    const fullClaims = await Promise.all(
      publicClaimsNeedingDetails.map((claim) => getClaim(claim.id))
    );

    await Promise.all(
      fullClaims
        .filter((claim): claim is ClaimData => claim !== null)
        .map((claim) => persistIndexedClaim(claim))
    );
  }

  return claims
    .map(sanitizeClaimForPublicRead)
    .map(mapClaimToVS)
    .sort((a, b) => b.id - a.id);
}

export async function refreshIndexedClaim(options: {
  claimId: number;
  inviteKey?: string | null;
  attempts?: number;
  attemptDelayMs?: number;
}) {
  const attempts = options.attempts ?? 1;
  const attemptDelayMs = options.attemptDelayMs ?? 0;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const claim = await fetchClaimForIndex(options.claimId, options.inviteKey);
    if (claim) {
      await persistIndexedClaim(claim);
      return claim;
    }

    if (attempt < attempts - 1 && attemptDelayMs > 0) {
      await delay(attemptDelayMs);
    }
  }

  return null;
}

export async function getVsWithInvite(
  claimId: number,
  inviteKey: string
): Promise<VSData | null> {
  const claim = await getClaimWithAccess(claimId, inviteKey);
  if (!claim) {
    return null;
  }

  try {
    await persistIndexedClaim(claim);
  } catch {
    // Private claims should still load even if the read index is unavailable.
  }

  return mapClaimToVS(claim);
}

export async function reconcileVsIndex(): Promise<ReconcileResult> {
  const now = Date.now();
  const [lastClaimCountValue, totalClaimCount, activeRows, openClaims] =
    await Promise.all([
      getSyncMeta("last_claim_count"),
      getClaimCount(),
      getClaimsByFilter({
        visibility: "public",
        states: ["open", "active"],
        orderBy: "id_desc",
      }),
      getOpenClaimSummaries(),
    ]);

  const lastClaimCount = Number(lastClaimCountValue ?? "0");
  let synced = 0;
  let newClaims = 0;
  let stateChanges = 0;

  if (totalClaimCount > lastClaimCount) {
    for (
      let startId = lastClaimCount + 1;
      startId <= totalClaimCount;
      startId += CLAIM_SYNC_PAGE_SIZE
    ) {
      const pageClaims = await getClaimSummaries(startId, CLAIM_SYNC_PAGE_SIZE);
      if (pageClaims.length === 0) {
        continue;
      }

      await persistIndexedClaims(pageClaims);
      synced += pageClaims.length;
      newClaims += pageClaims.length;
    }
  }

  if (openClaims.length > 0) {
    const existingById = new Map(activeRows.map((row) => [row.id, row]));
    await persistIndexedClaims(openClaims);
    synced += openClaims.length;

    for (const claim of openClaims) {
      const existing = existingById.get(claim.id);
      if (
        !existing ||
        existing.state !== claim.state ||
        existing.total_challenger_stake !== claim.total_challenger_stake ||
        existing.challenger_count !== claim.challenger_count
      ) {
        stateChanges += 1;
      }
    }
  }

  const liveOpenIds = new Set(openClaims.map((claim) => claim.id));
  const recentlyClosedIds = activeRows
    .filter((row) => !liveOpenIds.has(row.id))
    .map((row) => row.id);

  if (recentlyClosedIds.length > 0) {
    const closedClaims = await Promise.all(
      recentlyClosedIds.map((claimId) =>
        refreshIndexedClaim({
          claimId,
        })
      )
    );

    stateChanges += closedClaims.filter((claim) => claim !== null).length;
    synced += closedClaims.filter((claim) => claim !== null).length;
  }

  await Promise.all([
    setSyncMeta("last_claim_count", String(totalClaimCount)),
    setSyncMeta("last_sync_at", String(now)),
  ]);

  return {
    synced,
    new: newClaims,
    stateChanges,
  };
}

export async function getVsFeed(options: { forceRefresh?: boolean } = {}) {
  try {
    const rows = await getClaimsByFilter({
      visibility: "public",
      orderBy: "id_desc",
    });
    const lastSyncAt = Number((await getSyncMeta("last_sync_at")) ?? "0");
    const shouldRefresh =
      options.forceRefresh ||
      rows.length === 0 ||
      !lastSyncAt ||
      !isFresh(lastSyncAt, LIST_FRESHNESS_MS);

    if (shouldRefresh) {
      await reconcileVsIndex();
      const refreshedRows = await getClaimsByFilter({
        visibility: "public",
        orderBy: "id_desc",
      });
      return refreshedRows.map((row) => claimRowToVSData(row));
    }

    return rows.map((row) => claimRowToVSData(row));
  } catch {
    if (options.forceRefresh) {
      return (await refreshVSIndex()).items;
    }
    return getVsFeedFromCache();
  }
}

export async function getVsDetail(vsId: number) {
  try {
    const { row, challengerRows } = await loadStoredVsById(vsId);
    if (row?.visibility === "private") {
      return null;
    }

    const missingChallengerDetails =
      row != null &&
      row.challenger_count > 0 &&
      challengerRows.length < row.challenger_count;

    if (
      row &&
      !missingChallengerDetails &&
      (row.is_final === 1 || isFresh(row.updated_at, DETAIL_FRESHNESS_MS))
    ) {
      return claimRowToVSData(row, challengerRows);
    }

    const freshClaim = await refreshIndexedClaim({ claimId: vsId });
    if (freshClaim) {
      return mapClaimToVS(freshClaim);
    }

    if (row) {
      return claimRowToVSData(row, challengerRows);
    }
  } catch {
    // Fall through to the existing cache-backed path below.
  }

  return getVsByIdFromCache(vsId);
}

export async function getUserVs(address: string) {
  try {
    const storedEntries = await loadStoredUserVs(address);
    const storedItems = storedEntries.map((entry) => entry.vs);
    const shouldRefresh =
      storedEntries.length === 0 ||
      storedEntries.some(
        ({ row }) => row.is_final === 0 && !isFresh(row.updated_at, LIST_FRESHNESS_MS)
      );

    if (storedItems.length > 0 && !shouldRefresh) {
      return storedItems;
    }

    try {
      const freshItems = await hydrateUserClaimsFromContract(address);
      if (freshItems.length > 0) {
        return freshItems;
      }
    } catch {
      if (storedItems.length > 0) {
        return storedItems;
      }
    }

    return storedItems;
  } catch {
    try {
      const freshItems = await hydrateUserClaimsFromContract(address);
      if (freshItems.length > 0) {
        return freshItems;
      }
    } catch {
      // Keep falling back.
    }

    return getUserVsFromCache(address);
  }
}

export async function triggerPostWriteRefresh(options: {
  claimId: number;
  inviteKey?: string | null;
}) {
  return refreshIndexedClaim({
    claimId: options.claimId,
    inviteKey: options.inviteKey,
    attempts: POST_WRITE_REFRESH_ATTEMPTS,
    attemptDelayMs: POST_WRITE_REFRESH_DELAY_MS,
  });
}
