# PROVEN - Full Project Context for AI Agent

You are being onboarded to the PROVEN codebase. This document is **self-contained** — it includes all architecture, source code, types, and implementation status so you can work on this project without file access.

---

## What is PROVEN?

PROVEN is an **AI-settled prediction market** built on **GenLayer** (Bradbury Testnet, Chain ID 4221). Users create verifiable claims about real-world outcomes (sports, crypto, weather, culture), stake GEN tokens, and share a link for opponents to challenge. When the deadline arrives, the intelligent contract:

1. Fetches live evidence from the web via `gl.nondet.web.get()`
2. An LLM evaluates the evidence via `gl.nondet.exec_prompt()`
3. Multiple validators reach consensus via **Optimistic Democracy + Equivalence Principle**
4. The winner is paid automatically — no oracles, no committees, no disputes

**One-liner:** "An AI-settled claim market supporting head-to-head, 1-v-many, pool-odds, fixed-odds, and rivalry-linked rematches."

**Built for:** Aleph Hackathon 2026 (GenLayer Track)
**License:** MIT
**Default locale:** Spanish (es), also supports English (en)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router, Server Components), React 18, TypeScript 5 |
| Styling | Tailwind CSS 3.4, Framer Motion 12 (page transitions, stamp animations, confetti) |
| Blockchain | GenLayer Bradbury Testnet (Chain ID 4221), genlayer-js v0.23, viem 2.47 |
| Smart Contract | Python intelligent contract (`contracts/proven.py`, 881 lines) |
| Messaging | XMTP Browser SDK v7 (encrypted peer-to-peer 1v1 chat) |
| i18n | next-intl (Spanish default + English, ~310 translation keys each) |
| Auth | MetaMask (EIP-1193) primary + demo relay fallback |
| Notifications | Sonner (toast notifications) |
| Loading | nextjs-toploader (top loading bar) |
| Icons | Lucide React |
| Deployment | Vercel (frontend), GenLayer CLI (contract) |

---

## Project Structure

```
proven-app/
├── app/                        # Next.js 14 App Router
│   ├── layout.tsx              # Root layout: WalletProvider > XmtpProvider > children + Toaster
│   ├── globals.css             # Global styles
│   ├── [locale]/               # i18n locale routing (es, en)
│   │   ├── layout.tsx          # Locale layout with Header + main wrapper
│   │   ├── page.tsx            # Home — hero VS showcase + open claims + resolved winners
│   │   ├── dashboard/page.tsx  # User dashboard — my claims, stats (W-L), filter tabs
│   │   ├── explore/            # Browse open claims
│   │   │   ├── page.tsx        # Server wrapper
│   │   │   └── ExploreClient.tsx  # Client component with category/stake filters + search
│   │   ├── vs/
│   │   │   ├── create/page.tsx # Create claim form (market config, odds, stake, settlement)
│   │   │   └── [id]/page.tsx   # Claim detail (accept, resolve, rematch, XMTP chat)
│   │   └── messages/page.tsx   # XMTP messages hub (list active 1v1 conversations)
│   └── api/
│       ├── vs/route.ts         # GET /api/vs — list all public VS (paginated, 15s cache)
│       ├── vs/[id]/route.ts    # GET /api/vs/:id — single VS detail (invite param for private)
│       ├── vs/user/[address]/  # GET /api/vs/user/:address — user's VS
│       └── demo/write/route.ts # POST /api/demo/write — demo relay endpoint
├── components/
│   ├── Header.tsx              # Navbar: logo, nav links, wallet connect, language switcher, Messages chip
│   ├── VSCard.tsx              # Claim card (dashboard compact view)
│   ├── ArenaCard.tsx           # Claim card (explore/home arena view)
│   ├── DemoRoleSwitcher.tsx    # Demo mode role toggle (creator/challenger/resolver)
│   ├── ResolutionTerminal.tsx  # Terminal-style resolution reveal animation
│   ├── Confetti.tsx            # Win celebration confetti
│   ├── ProvenStamp.tsx         # "PROVEN" stamp animation on resolution
│   ├── PageTransition.tsx      # Framer Motion page transitions + AnimatedItem wrapper
│   ├── EmptyState.tsx          # Empty state component with CTA
│   ├── xmtp/
│   │   └── VsXmtpPanel.tsx    # In-page 1v1 chat panel for accepted claims
│   ├── MessagesHub.tsx         # List of active conversations
│   └── ui/                     # Primitives: Button, Badge, Chip, Input, GlassCard,
│                               #   CountdownTimer, Skeleton, Avatar, PoolBadge, VSStrip, VSCardSkeleton
├── contracts/
│   └── proven.py               # THE intelligent contract (881 lines, Python) — ALL business logic
├── lib/
│   ├── contract.ts             # Client wrapper: TypeScript types + all contract read/write functions
│   ├── wallet.tsx              # WalletProvider context (MetaMask connect/disconnect/account change)
│   ├── genlayer.ts             # GenLayer client factory, chain config, wallet chain management
│   ├── constants.ts            # Categories, prefills, helpers (shortenAddress, getShareUrl, etc.)
│   ├── demo-mode.ts            # isDemoRelayEnabled(), getDemoModeLabel()
│   ├── pending-vs.ts           # Optimistic localStorage pending VS (5 min expiry)
│   ├── private-links.ts        # Private invite key generation + localStorage storage
│   ├── hooks.ts                # useCountdown hook
│   ├── fonts.ts                # Font loading config
│   ├── sampleVs.ts             # Static sample VS data for UI demos
│   ├── xmtp/
│   │   ├── XmtpProvider.tsx    # React context for XMTP client
│   │   ├── signer.ts           # createXmtpSignerFromEthereum bridge
│   │   ├── config.ts           # isXmtpFeatureEnabled() check
│   │   ├── chat-thread.ts      # Conversation/message thread logic
│   │   ├── vs-chat-eligibility.ts # Rules for when chat panel shows
│   │   ├── optimistic-send.ts  # Optimistic message sending
│   │   ├── types.ts            # XMTP type definitions
│   │   └── index.ts            # Re-exports
│   └── server/
│       ├── vs-cache.ts         # In-memory + file-backed cache (15s revalidation, 5 min full rebuild)
│       ├── demo-relay.ts       # Server-side demo signer routing
│       └── api-validation.ts   # API error helpers
├── hooks/
│   ├── useExploreFilterState.ts  # Filter state for explore page
│   ├── useVsXmtpThread.ts       # XMTP conversation hook for VS detail
│   └── useDemoRole.ts           # Demo role state hook
├── i18n/
│   ├── config.ts               # next-intl locale config
│   ├── navigation.ts           # Locale-aware Link and navigation
│   └── request.ts              # Server-side locale request handler
├── messages/
│   ├── en.json                 # English translations (~310 keys)
│   └── es.json                 # Spanish translations (~310 keys)
├── middleware.ts               # next-intl locale routing middleware
├── deploy/deploy.ts            # Contract deployment script
├── scripts/                    # Build/deploy/test helper scripts
├── tests/
│   ├── node/                   # Smoke tests (API validation, contract method availability)
│   ├── direct/                 # Fast in-memory contract tests (mocked web/LLM)
│   └── integration/            # Full tests on localnet/studionet with consensus
├── docs/xmtp-integration.md   # XMTP 7-step integration guide (all complete)
├── implementation-checklist.md # Feature roadmap with priorities
├── deep-research-report.md     # Game theory / betting model analysis
├── AGENTS.md                   # GenLayer workflow rules and skill references
├── .env.example                # Environment variable template
├── next.config.js              # next-intl plugin wrapper, strict mode
├── tailwind.config.ts          # Dark theme, custom colors, animations, glow effects
├── tsconfig.json               # Strict mode, @/* path alias
└── gltest.config.yaml          # GenLayer network config (localnet/bradbury/studionet)
```

---

## Environment Variables

**Public (exposed to browser):**
```
NEXT_PUBLIC_CONTRACT_ADDRESS        # Deployed contract address on Bradbury
NEXT_PUBLIC_GENLAYER_RPC            # GenLayer RPC endpoint
NEXT_PUBLIC_GENLAYER_MAIN_CONTRACT  # Consensus main contract address
NEXT_PUBLIC_DEMO_MODE               # "1" to enable demo relay
NEXT_PUBLIC_DEMO_MODE_LABEL         # Optional demo banner label
NEXT_PUBLIC_XMTP_ENV                # XMTP network: local, dev, production
NEXT_PUBLIC_FEATURE_XMTP            # Enable XMTP UI: 1, true, or yes
NEXT_PUBLIC_XMTP_APP_VERSION        # App id for XMTP telemetry
```

**Server-only:**
```
GENLAYER_RPC                        # Server-side RPC override
GENLAYER_MAIN_CONTRACT              # Server-side consensus contract
DEMO_CREATOR_PRIVATE_KEY            # Demo signer for create/rematch
DEMO_CHALLENGER_PRIVATE_KEY         # Demo signer for challenge
DEMO_RESOLVER_PRIVATE_KEY           # Demo signer for resolve
DEMO_SIGNER_PRIVATE_KEY             # Fallback demo signer
```

---

## Key NPM Scripts

```bash
npm run dev                     # Start dev server
npm run build                   # Production build
npm run contract:check          # Lint GenLayer contract
npm run test:direct             # Fast in-memory contract tests
npm run test:integration        # Integration tests (default network)
npm run test:smoke              # Node smoke tests
npm run deploy:contract         # Deploy to GenLayer Bradbury
npm run contract:stage          # Staged: lint → direct → localnet → studionet
npm run warm:vs-index           # Pre-warm API cache
```

---

## COMPLETE SOURCE CODE: Smart Contract

### `contracts/proven.py` (881 lines — the ENTIRE business logic)

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
from genlayer import *

ST_OPEN = "open"
ST_ACTIVE = "active"
ST_RESOLVED = "resolved"
ST_CANCELLED = "cancelled"

SIDE_CREATOR = "creator"
SIDE_CHALLENGERS = "challengers"
SIDE_DRAW = "draw"
SIDE_UNRESOLVABLE = "unresolvable"

MARKET_BINARY = "binary"
MARKET_MONEYLINE = "moneyline"
MARKET_SPREAD = "spread"
MARKET_TOTAL = "total"
MARKET_PROP = "prop"
MARKET_CUSTOM = "custom"

ODDS_POOL = "pool"
ODDS_FIXED = "fixed"

VISIBILITY_PUBLIC = "public"
VISIBILITY_PRIVATE = "private"

MAX_CHALLENGERS = 100
DEFAULT_FIXED_PAYOUT_BPS = 20000
MIN_STAKE = 2


@allow_storage
@dataclass
class Claim:
    creator: Address
    question: str
    creator_position: str
    counter_position: str
    resolution_url: str
    creator_stake: u256
    total_challenger_stake: u256
    reserved_creator_liability: u256
    deadline: u256
    state: str
    winner_side: str
    resolution_summary: str
    confidence: u256
    category: str
    parent_id: u256
    challenger_count: u256
    created_at: u256
    market_type: str
    odds_mode: str
    challenger_payout_bps: u256
    handicap_line: str
    settlement_rule: str
    max_challengers: u256
    visibility: str
    invite_key: str


class ProvenContract(gl.Contract):
    claims: TreeMap[u256, Claim]
    claim_count: u256
    ch_addr: TreeMap[u256, Address]
    ch_amount: TreeMap[u256, u256]
    wins: TreeMap[Address, u256]
    losses: TreeMap[Address, u256]
    total_resolved: u256

    def __init__(self):
        self.claim_count = u256(0)
        self.total_resolved = u256(0)

    def _ch_key(self, claim_id: u256, index: u256) -> u256:
        return u256(claim_id * u256(MAX_CHALLENGERS) + index)

    # ... normalization helpers (_normalize_text, _normalize_category, _normalize_market_type,
    #     _normalize_odds_mode, _normalize_max_challengers, _normalize_fixed_payout_bps,
    #     _normalize_visibility, _normalize_invite_key)

    def _default_settlement_rule(self, category: str, market_type: str) -> str:
        # Returns category-specific settlement templates:
        # deportes: official final result, overtime rules
        # crypto: linked source price at deadline
        # clima: linked weather source for named place/date
        # cultura: official/authoritative publication result
        # custom: linked source only, UNRESOLVABLE if ambiguous

    def _category_resolution_guidance(self, category: str) -> str:
        # Returns category-specific guidance for AI judge:
        # deportes: prefer official league/scoreboard
        # crypto: treat linked page as canonical price source
        # clima: use location-specific weather source
        # cultura: prefer official publication/awards page

    def _require_stake_value(self, stake_amount: u256):
        if stake_amount < u256(MIN_STAKE):
            raise gl.vm.UserError(f"Stake must be at least {MIN_STAKE}")
        if gl.message.value != stake_amount:
            raise gl.vm.UserError("Sent value must equal stake amount")

    def _gross_payout(self, stake_amount: u256, payout_bps: u256) -> u256:
        return u256((stake_amount * payout_bps) // u256(10000))

    def _creator_liability_for(self, stake_amount: u256, payout_bps: u256) -> u256:
        gross_payout = self._gross_payout(stake_amount, payout_bps)
        if gross_payout <= stake_amount:
            return u256(0)
        return u256(gross_payout - stake_amount)

    # _transfer, _add_win, _add_loss, _claim_to_dict helpers...

    @gl.public.write.payable
    def create_claim(self, question, creator_position, counter_position,
                     resolution_url, deadline, stake_amount, category="custom",
                     parent_id=0, market_type="binary", odds_mode="pool",
                     challenger_payout_bps=0, handicap_line="", settlement_rule="",
                     max_challengers=0, visibility="public", invite_key="") -> int:
        # Validates inputs, normalizes all fields
        # Creates Claim in claims TreeMap
        # Returns claim ID

    @gl.public.write.payable
    def create_rematch(self, parent_id, deadline, stake_amount, ...):
        # Creates new claim inheriting fields from parent claim
        # Links via parent_id

    @gl.public.write.payable
    def challenge_claim(self, claim_id, stake_amount, invite_key=""):
        # Validates: claim exists, is open/active, not self-challenge, not duplicate
        # For private claims: validates invite_key
        # For fixed odds: checks creator has enough liquidity
        # Stores challenger address and stake
        # Sets state to "active"

    @gl.public.write
    def resolve_claim(self, claim_id):
        # Must be "active" state
        # leader_fn: fetches web data via gl.nondet.web.get(url), truncates to 6000 chars
        # Builds detailed prompt with market terms, settlement rules, category guidance
        # Calls gl.nondet.exec_prompt(prompt, response_format="json")
        # Returns {verdict, confidence, explanation}
        # validator_fn: independently runs leader_fn and compares verdicts
        # gl.vm.run_nondet_unsafe(leader_fn, validator_fn) for consensus
        #
        # PAYOUT LOGIC:
        # CREATOR_WINS: creator gets entire pot (creator_stake + all challenger stakes)
        # CHALLENGERS_WIN:
        #   - Pool mode: each challenger gets stake + (their_stake/total_challenger_stake * creator_stake)
        #   - Fixed mode: each challenger gets gross_payout(stake, payout_bps), creator gets remainder
        # DRAW/UNRESOLVABLE: everyone gets their original stake back

    @gl.public.write
    def cancel_claim(self, claim_id):
        # Only creator, only "open" state, refunds creator stake

    @gl.public.view
    def get_claim(self, claim_id) -> dict:              # Full claim with challengers (public only)
    def get_claim_summary(self, claim_id) -> dict:      # Without challenger details
    def get_claim_with_access(self, claim_id, invite_key) -> dict:  # Private claim access
    def get_claim_summaries(self, start_id, limit) -> list:         # Paginated, skips private
    def get_claim_count(self) -> int:
    def get_user_claims(self, user_address) -> list:    # IDs where user is creator or challenger
    def get_user_claim_summaries(self, user_address) -> list:
    def get_open_claims(self) -> list:                  # IDs of open/active public claims
    def get_open_claim_summaries(self) -> list:
    def get_claims_by_parent(self, parent_id) -> list:
    def get_user_stats(self, user_address) -> dict:     # {wins, losses, total}
    def get_pool(self) -> int:                          # Contract balance
    def get_platform_stats(self) -> dict:               # {total_claims, total_resolved, total_pool}
    def get_rivalry_chain(self, claim_id) -> list:      # Full chain from root to all descendants
```

### Key Contract Behaviors:
- **Claim ID**: auto-incrementing counter (1, 2, 3, ...)
- **Challengers stored as**: `ch_addr[claim_id * 100 + index]` and `ch_amount[claim_id * 100 + index]`
- **Min stake**: 2 GEN tokens
- **Max challengers**: 100 per claim
- **Fixed payout BPS**: basis points (20000 = 2.0x). Min is 10000 (1.0x)
- **Resolution prompt**: includes question, positions, category, market type, odds mode, handicap line, settlement rule, category guidance, and fetched web evidence
- **Consensus**: `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` — leader proposes, validators independently verify by running same logic and comparing verdict strings

---

## COMPLETE SOURCE CODE: TypeScript Types & Contract Client

### `lib/contract.ts` — Key TypeScript interfaces

```typescript
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
  opponent: string;           // first_challenger or ZERO_ADDRESS
  question: string;
  creator_position: string;
  opponent_position: string;  // mapped from counter_position
  resolution_url: string;
  stake_amount: number;       // mapped from creator_stake
  deadline: number;
  state: "open" | "accepted" | "resolved" | "cancelled";  // "active" → "accepted"
  winner: string;             // address of winner or ZERO_ADDRESS
  resolution_summary: string;
  created_at: number;
  category: string;
  // Plus all ClaimData optional fields...
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
```

### Contract Client Functions (lib/contract.ts)

**Read functions:**
- `getClaim(claimId)` → `ClaimData | null`
- `getClaimWithAccess(claimId, inviteKey)` → `ClaimData | null`
- `getClaimSummaries(startId, limit)` → `ClaimData[]`
- `getClaimCount()` → `number`
- `getUserClaims(address)` → `number[]`
- `getOpenClaims()` → `number[]`
- `getRivalryChain(claimId)` → `number[]`
- `getUserClaimSummaries(address)` → `ClaimData[]`
- `getOpenClaimSummaries()` → `ClaimData[]`
- `getAllVSFast()` → `VSData[]` (browser: uses /api/vs, server: paginated contract calls)
- `getUserVSFast(address)` → `VSData[]`
- `getVS(vsId, {inviteKey?, viewerAddress?})` → `VSData | null`

**Write functions (wallet-signed):**
- `createClaim(wallet, params)` → `ClaimWriteResult` (txHash + claimId)
- `createRematch(wallet, parentId, params)` → `ClaimWriteResult`
- `challengeClaim(wallet, claimId, stakeAmount, inviteKey?)` → `ContractWriteResult`
- `resolveClaim(wallet, claimId)` → `ContractWriteResult`
- `cancelClaim(wallet, claimId)` → `ContractWriteResult`

**Demo write functions (server relay):**
- `createClaimDemo(params)` → `ClaimWriteResult`
- `createRematchDemo(parentId, params)` → `ClaimWriteResult`
- `challengeClaimDemo(claimId, stakeAmount, inviteKey?)` → result
- `resolveClaimDemo(claimId)` → result
- `cancelClaimDemo(claimId)` → result

**Helper functions:**
- `mapClaimToVS(claim)` — maps ClaimData to VSData (state: "active" → "accepted", sets opponent/winner)
- `isVSJoinable(vs, address?)` — checks if user can challenge
- `didUserChallengeVS(vs, address)` — checks if user is a challenger
- `hasVSWinner(vs)` — checks if there's a winner
- `didUserWinVS(vs, address)` / `didUserLoseVS(vs, address)`
- `getVSTotalPot(vs)` — creator_stake + total_challenger_stake
- `getVSSingleWinnerPayout(vs)` — calculated payout amount
- `isVSPrivate(vs)` — checks visibility

### Write Transaction Flow:

1. **Browser (MetaMask)**: `sendBrowserWriteTransaction` → encodes calldata using `genlayer-js` ABI → calls `addTransaction` on consensus main contract via `eth_sendTransaction` → waits for EVM receipt (20s timeout) → returns `{txHash, receipt: null, pending: true}`
2. **Server (SDK)**: `sendRpcWriteTransaction` → `client.writeContract(...)` → extracts GenLayer txId from `CreatedTransaction` event → polls `waitForTransactionReceipt` for ACCEPTED status (60s timeout)
3. **Claim ID inference**: For pending writes, uses `claimCount + 1` optimistically

---

## COMPLETE SOURCE CODE: Wallet Provider

### `lib/wallet.tsx`

```typescript
"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ensureGenlayerWalletChain } from "./genlayer";

interface WalletCtx {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export function WalletProvider({ children }) {
  // connect(): calls ensureGenlayerWalletChain(ethereum) then eth_requestAccounts
  // disconnect(): clears address
  // useEffect: listens for accountsChanged, restores session on mount
  // Errors: "no_wallet", "rejected" (code 4001), "error"
}

export function useWallet() { return useContext(Ctx); }
```

### `lib/genlayer.ts`

```typescript
// DEFAULT_SERVER_ENDPOINT = "https://rpc-bradbury.genlayer.com"
// DEFAULT_EXPLORER_URL = "https://explorer-bradbury.genlayer.com"
// DEFAULT_CONSENSUS_MAIN_CONTRACT = "0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D"

export function getEndpoint(): string | undefined
export function getConsensusMainContractAddress(): string
export function getWalletChainParams(): { chainId, chainName, rpcUrls, nativeCurrency, blockExplorerUrls }
export async function ensureGenlayerWalletChain(ethereum): Promise<void>
  // Checks current chainId, switches or adds Bradbury chain if needed

export function createGenlayerClient(accountAddress?): Client
export function createGenlayerClientWithKey(privateKey): Client
export function getExplorerTxUrl(txHash): string
```

---

## COMPLETE SOURCE CODE: Server-Side Cache

### `lib/server/vs-cache.ts`

```typescript
// In-memory + file-backed cache for VS data
// VS_REVALIDATE_SECONDS = 15
// VS_FULL_REBUILD_MS = 5 * 60 * 1000 (5 minutes)
// VS_PAGE_SIZE = 50

// Snapshot stored at: .cache/vs-index-[CONTRACT_ADDRESS].json
// On Vercel: /tmp/proven-cache/vs-index-[CONTRACT_ADDRESS].json

// Logic:
// 1. On request, check if in-memory snapshot is fresh (< 15s old)
// 2. If not, check disk snapshot
// 3. If stale, fetch new claims from contract (paginated)
// 4. Upsert new/updated items into snapshot
// 5. Refresh active (open/accepted) claims from get_open_claim_summaries
// 6. Detect recently-closed claims and fetch their updated state
// 7. Persist to disk and memory

export async function getAllVSFast(): Promise<VSData[]>
export async function getVSByIdFast(vsId: number): Promise<VSData | null>
export async function getUserVSFast(address: string): Promise<VSData[]>
export async function refreshVSIndex(): Promise<VSSnapshot>
```

---

## COMPLETE SOURCE CODE: Demo Relay

### `lib/server/demo-relay.ts`

```typescript
// Server-side signer routing for demo mode
// Signer selection by action:
//   create_claim / create_rematch → DEMO_CREATOR_PRIVATE_KEY
//   challenge_claim → DEMO_CHALLENGER_PRIVATE_KEY
//   resolve_claim → DEMO_RESOLVER_PRIVATE_KEY
//   Fallback: DEMO_SIGNER_PRIVATE_KEY

// Write flow:
// 1. Create genlayer client with private key
// 2. Call writeContract on the contract
// 3. Handle "not processed by consensus" error by scanning recent blocks for CreatedTransaction event
// 4. Wait for ACCEPTED status (10 retries, 5s interval)
// 5. Return { txHash, claimId, pending, actor }
```

### `app/api/demo/write/route.ts`

```typescript
// POST handler:
// 1. Checks NEXT_PUBLIC_DEMO_MODE === "1"
// 2. Parses DemoWriteRequest from body
// 3. Calls executeDemoWrite(payload)
// 4. Returns 202 if pending, 200 if accepted
```

---

## COMPLETE SOURCE CODE: API Routes

### `GET /api/vs` (app/api/vs/route.ts)
- Returns `{ items: VSData[], count: number }` with `s-maxage=15, stale-while-revalidate=60`
- Supports `?refresh=1` to force cache rebuild

### `GET /api/vs/:id` (app/api/vs/[id]/route.ts)
- Returns `{ item: VSData }` with cache headers
- Supports `?invite=KEY` for private claims (no-cache for private)
- Returns 404 if not found

### `POST /api/demo/write` (app/api/demo/write/route.ts)
- Body: `DemoWriteRequest` (action + params)
- Actions: `create_claim`, `create_rematch`, `challenge_claim`, `resolve_claim`, `cancel_claim`
- Returns `{ txHash, claimId, pending, actor }`

---

## COMPLETE SOURCE CODE: Pages

### Home Page (`app/[locale]/page.tsx`)
- Fetches all VS via `getAllVSFast()`, merges with pending VS from localStorage
- **Hero section**: If VS exists → featured VS card with pool badge; if empty → "Get it PROVEN." headline + CTAs
- **Differentiator stats**: 1.2M+ bets, $450M+ paid, 99.9% accuracy (decorative)
- **"THE PROTOCOL" section**: 4-step flow (Challenge → Invite → Accept → Proven)
- **LIVE ARENA**: Top 3 claims as ArenaCards (fallback to sample data if empty)
- **"READY TO WIN?" CTA**: Full-width card with challenge button
- **Global stats**: Total VS, resolved count, total pool
- **Open VS preview**: Up to 4 VSCards with "view all" link
- **Recently proven**: Resolved VS with winner + payout

### Dashboard (`app/[locale]/dashboard/page.tsx`)
- Requires wallet connection (shows EmptyState if not connected)
- Fetches user's VS via `getUserVSDirect(address)`, merges pending
- **Stats bar**: W-L record, win rate %, total GEN won
- **Tabs**: All | Active | Done (with animated underline)
- **VS list**: Grid of cards showing badge, question, VS strip, pool amount
- Distinguishes won/lost states per user

### Create Page (`app/[locale]/vs/create/page.tsx`)
- **State**: question, positions, URL, deadline, stake, category, market type, odds mode, fixed odds multiple, handicap line, settlement rule, max challengers, visibility
- **Category chips**: deportes, clima, crypto, tech, cultura (with prefill data)
- **Visibility toggle**: public / private
- **Position inputs**: "I bet" + "Rival bets" (or "Challenger side bets" for 1-vs-many)
- **Stake selector**: Preset buttons (2, 5, 10, 25 GEN) + minimum hint
- **Verification source**: URL input + category-specific guidance + example sources
- **Deadline**: Preset buttons (1h, 24h, 3 days, 1 week) + custom datetime picker
- **Advanced panel** (collapsible): market type dropdown, odds mode dropdown, fixed odds multiple, handicap line, settlement rule, max challengers
- **Quality warnings**: "too vague", "no source", "needs settlement rule"
- **Rematch support**: Reads `?rematch=ID` from URL, loads parent VS, pre-fills form
- **Submit**: Validates all fields → calls `createClaim` or `createClaimDemo` → saves optimistic pending VS → shows success screen with share link (WhatsApp, Telegram)

### VS Detail Page (`app/[locale]/vs/[id]/page.tsx`)
- **Progress bar**: Created → Accepted → Verifying → Proven (animated)
- **Resolution display**: ProvenStamp (winner + amount + summary) or ResolutionTerminal during resolution
- **Main card**: Question headline, Creator vs Challenger(s) layout, pool/stake/deadline/slots stats
- **Challenge flow**: Stake input + "Accept Challenge" button (validates min stake, checks joinability)
- **Resolve flow**: "Resolve" button (only after deadline expired) → animated terminal phases → confetti
- **Cancel flow**: Only creator, only open state
- **XMTP Chat panel**: VsXmtpPanel (only after challenge accepted)
- **Market terms card**: Market type, odds mode, format, visibility, fixed payout, handicap, settlement rule
- **Challenger list**: Shows all challengers with stakes and potential payouts (for multi-challenger claims)
- **Rivalry chain**: If has parent_id or is resolved, shows linked rematch history
- **Share section**: Copy link button, WhatsApp/Telegram share, explorer TX link
- **Demo mode**: DemoRoleSwitcher for testing without wallet
- **Polling**: Refreshes VS data every 10s, shows optimistic data from localStorage while pending

### Explore Page (`app/[locale]/explore/ExploreClient.tsx`)
- **Search**: Text search on questions
- **Category filter chips**: All categories from constants
- **Stake filter**: Buttons for stake ranges
- **VS grid**: ArenaCards with category badges, pool amounts

### Messages Page (`app/[locale]/messages/page.tsx`)
- Lists active XMTP 1v1 conversations
- Feature-gated by `NEXT_PUBLIC_FEATURE_XMTP`

---

## COMPLETE SOURCE CODE: Key Components

### `components/Header.tsx`
- Sticky header with blur backdrop
- Logo: "PROVEN." with animated dot
- Desktop nav: Challenge (accent), Explore, My VS, Messages (conditional on XMTP flag)
- Language switcher: ES | EN
- Wallet: Connected → shortened address dropdown with disconnect; Not connected → "Connect" button
- Mobile: Hamburger menu with animated sheet, same nav items

### Root Layout (`app/layout.tsx`)
```jsx
<html className={fonts}>
  <body>
    <NextTopLoader color="#22D3EE" />
    <WalletProvider>
      <XmtpProvider>
        {children}
      </XmtpProvider>
      <Toaster position="bottom-center" theme="dark" />
    </WalletProvider>
  </body>
</html>
```

---

## COMPLETE SOURCE CODE: Helpers

### `lib/constants.ts`
```typescript
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MIN_STAKE = 2;

export const CATEGORIES = [
  { id: "deportes", label: "Deportes", color: "#22D3EE" },
  { id: "clima",    label: "Clima",    color: "#E879F9" },
  { id: "crypto",   label: "Crypto",   color: "#FBBF24" },
  { id: "tech",     label: "Tech",     color: "#818CF8" },
  { id: "cultura",  label: "Cultura",  color: "#10B981" },
  { id: "custom",   label: "Custom",   color: "#A1A1AA" },
];

// CATEGORY_DEMO_GUIDANCE: per-category sourceExamples, sourceHint, settlementTemplate, questionHint
// PREFILLS: per-category example questions in Spanish
// shortenAddress(a, chars=4) → "0x1234…5678"
// formatDeadline(ts, locale) → localized date string
// getTimeRemaining(deadline) → { expired, text, total }
// getShareUrl(vsId, inviteKey?) → full URL with invite param
// normalizeResolutionSource(value) → normalized https URL or ""
// getCategoryInfo(cat) → category object from CATEGORIES
```

### `lib/pending-vs.ts`
```typescript
// localStorage key: "proven_pending_vs"
// PendingVS extends VSData with { pending: true, createdAtMs, txHash? }
// MAX_AGE_MS = 5 * 60 * 1000 (5 minutes)
// savePendingVS(vs) — stores optimistic VS
// getPendingVS(id) — retrieves by ID
// removePendingVS(id) — removes once on-chain
// mergePendingVS(onChain, filterAddress?) — prepends pending to on-chain list, removes confirmed
```

### `lib/demo-mode.ts`
```typescript
export function isDemoRelayEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}
export function getDemoModeLabel() {
  return process.env.NEXT_PUBLIC_DEMO_MODE_LABEL || "Bradbury demo mode";
}
```

---

## Authentication System

### Primary: MetaMask Wallet (EIP-1193)
1. User clicks "Connect Wallet"
2. `ensureGenlayerWalletChain(ethereum)` — switches to Bradbury (chain 4221) or adds it
3. `eth_requestAccounts` → gets user address
4. Address stored in React context via `WalletProvider`
5. Account change listener keeps state in sync
6. All write transactions signed by user's private key

### Fallback: Demo Relay Mode
- Enabled when `NEXT_PUBLIC_DEMO_MODE=1` and no wallet connected
- Server-side signers: separate keys for creator, challenger, resolver roles
- Writes routed through `POST /api/demo/write`
- `DemoRoleSwitcher` component lets user toggle between roles
- Demo banner shows when active; hides when real wallet connected
- Useful for testing/demos without managing testnet wallets

---

## XMTP Messaging (All 7 Steps Complete)

- Encrypted 1v1 chat between claim creator and challenger
- `VsXmtpPanel` component renders in `/vs/[id]` detail page (only after challenge accepted)
- `MessagesHub` at `/messages` lists active conversations
- Feature-gated via `NEXT_PUBLIC_FEATURE_XMTP=1`
- Navbar "Messages" chip appears conditionally
- Signer bridge: `createXmtpSignerFromEthereum(provider, address)` — reuses MetaMask wallet

### XMTP Architecture:
- `lib/xmtp/XmtpProvider.tsx` — React context for XMTP client lifecycle
- `lib/xmtp/signer.ts` — Bridges MetaMask to XMTP signer
- `lib/xmtp/config.ts` — Feature flag check
- `lib/xmtp/chat-thread.ts` — Conversation/message thread management
- `lib/xmtp/vs-chat-eligibility.ts` — Rules for when chat shows (requires accepted challenge)
- `lib/xmtp/optimistic-send.ts` — Optimistic message rendering before confirmation
- `hooks/useVsXmtpThread.ts` — React hook for VS detail page chat

---

## Design System & Styling

### Color Palette (Tailwind custom colors)
```
pv-bg:       #09090B (zinc-950)     — page background
pv-surface:  #18181B (zinc-900)     — card backgrounds
pv-surface2: #27272A (zinc-800)     — secondary surfaces
pv-text:     #FAFAFA (zinc-50)      — primary text
pv-muted:    #71717A (zinc-500)     — secondary text
pv-border:   #3F3F46 (zinc-700)     — borders
pv-emerald:  #4EDEA3                — primary accent (CTAs, success, active states)
pv-cyan:     #5DE6FF                — creator side color
pv-fuch:     #F8ACFF                — challenger side color
pv-gold:     #FFD166                — amounts, financial data
```

### UI Components
- **GlassCard**: `backdrop-blur-[18px] bg-white/[0.03] border border-white/[0.1]`, optional glow variants
- **Button**: primary (emerald bg), ghost (transparent border), with sizes sm/md/lg
- **Badge**: status-colored chips (open, accepted, resolved, cancelled, won, lost)
- **Chip**: pill-shaped toggle/filter buttons
- **Input**: with colored dot indicator and mono variant
- **Avatar**: side-colored circles (cyan for creator, fuchsia for challenger)
- **CountdownTimer**: live countdown with expired state
- **VSStrip**: compact creator vs opponent display
- **PoolBadge**: gold-colored pool amount display

### Animations
- Page transitions: `fadeUp` via Framer Motion
- Stamp: `stampIn` keyframe with scale bounce
- Confetti: particle drop animation
- Terminal reveal: typewriter-style resolution phases
- Tab underline: spring-based `layoutId` animation
- Card hover: subtle x-shift via `whileHover`

---

## Architecture Flow

```
User (Browser)
  │
  ├─ MetaMask signs transactions
  │
  ├─ genlayer-js SDK → GenLayer Bradbury Contract (Python)
  │                         │
  │                         ├─ gl.nondet.web.get(url) → External Sources (ESPN, CoinGecko, weather.com...)
  │                         │
  │                         ├─ gl.nondet.exec_prompt(prompt) → LLM Evaluators
  │                         │
  │                         └─ Optimistic Democracy Consensus (multiple validators)
  │                               │
  │                               └─ Resolution + automatic payout via _transfer()
  │
  ├─ XMTP SDK → Encrypted 1v1 messaging (signed by same wallet)
  │
  └─ Next.js API → In-memory cache (15s TTL) → Contract read calls
```

**Trust boundaries:**
- User ↔ Frontend: MetaMask signature on every write
- Frontend ↔ Contract: Wallet-signed transactions via genlayer-js SDK
- Contract ↔ Web: Multi-validator independent web fetching + verification
- AI Verdict: Consensus via Optimistic Democracy + Equivalence Principle
- API Cache: Read-only convenience layer; writes always go direct to contract

---

## What's IMPLEMENTED (Done)

- [x] **Unified claim engine** — single contract handles 1v1 and 1-vs-many
- [x] **Pool odds** (pari-mutuel) and **fixed odds** (creator-backed payout multiples)
- [x] **6 market types**: binary, moneyline, spread, total, prop, custom
- [x] **Custom handicap lines and settlement rules**
- [x] **Rivalry/rematch system** — parent_id links, create_rematch(), get_rivalry_chain()
- [x] **Public + private (invite-link) claims** with invite key validation
- [x] **Full create UI** — market type selector, odds mode, stake, settlement rules, source URL, category guidance
- [x] **Full detail UI** — challenger list, market terms, rivalry chain, resolution display, XMTP chat
- [x] **AI-powered resolution** — web fetching + LLM evaluation + multi-validator consensus
- [x] **MetaMask wallet auth** — connect, auto-chain-add, account change listener
- [x] **Demo relay mode** — server-side signers, role switcher, demo banner
- [x] **Optimistic pending VS** — localStorage-based optimistic UI (5 min expiry)
- [x] **XMTP 1v1 encrypted chat** — all 7 integration steps complete
- [x] **Messages hub** — `/messages` page listing active conversations
- [x] **i18n** — Spanish (default) + English with ~310 translation keys
- [x] **API cache layer** — in-memory + file-backed, 15s revalidation
- [x] **Category-specific settlement templates** (sports, crypto, weather, culture, custom)
- [x] **Claim quality nudges** in create flow ("too vague", "no source", "needs settlement rule")
- [x] **Minimum stake enforcement** (2 GEN) in contract + UI
- [x] **Home page** — hero showcase, protocol steps, live arena, open claims, resolved winners
- [x] **Dashboard** — my claims, W-L stats, win rate, filter tabs
- [x] **Explore page** — browse with category/stake filters and search
- [x] **Animations** — Framer Motion transitions, stamp-in, confetti, terminal reveal
- [x] **Dark theme UI** — glass-morphism cards, glow effects, emerald/cyan/fuchsia accents
- [x] **Test suite** — direct (fast/mocked), integration (network), node (smoke)
- [x] **Share links** — WhatsApp, Telegram integration with invite key support
- [x] **Explorer TX links** — links to Bradbury explorer for each transaction

---

## What's NOT IMPLEMENTED (Remaining Work)

### High Priority
- [ ] **Event-time and lock-window rules** — prevent late information sniping. Needs contract fields `event_time`, `lock_window_seconds`. Challengers blocked after `event_time - lock_window`
- [ ] **Redeploy contract and refresh envs** — update `NEXT_PUBLIC_CONTRACT_ADDRESS` locally and on Vercel after any contract changes
- [ ] **Confidence/dispute policy** — high confidence → settle normally; medium → flag as contested; low → refund as unresolvable. Currently confidence is stored but not acted upon

### Medium Priority
- [ ] **Ratio guardrails** — max challenger pool relative to creator stake, per-user cap, minimum opposing liquidity before claim is valid
- [ ] **Oracle safety improvements** — whitelist trusted demo-safe sources, reduce ambiguous `resolution_url` usage, refund on low-confidence/conflicting sources
- [ ] **Creation timestamps** — populate meaningful timestamps (onchain if safe source exists, otherwise in read model). Currently `created_at` is always 0
- [ ] **Rivalry series metadata** — round number, series score, "best of 3" style UI
- [ ] **Better public info for thin pools** — qualitative heat/challenger counts in discovery, exact payout math only on detail pages

### Growth / Marketplace Quality
- [ ] **Anti-spam economics** — winner-only commission on profit, or creator posting bond (0% fee is fine for demo)
- [ ] **UI that doesn't overstate crowd certainty** — prefer payout multiples over raw social counters
- [ ] **Abuse monitoring** — sybil detection (repeated pairs, unusual win-rates, private-link cluster activity)

### Infrastructure
- [ ] **Database/indexer decision** — currently cache-only (`lib/server/vs-cache.ts`). Scale path: Neon/Postgres + worker/indexer
- [ ] **Pre-warm index before demos** — `npm run warm:vs-index` should run before live presentations
- [ ] **End-to-end deploy flow validation** — `scripts/genlayer-deploy.mjs`, receipt recovery path, `.env.local` sync

---

## Working Rules

- Run `npm run contract:check` after every contract change and before tests
- Prefer `npm run test:direct` first; escalate to integration tests only when consensus behavior matters
- `contracts/proven.py` is the source of truth — keep `lib/contract.ts` types and function signatures aligned
- When updating contract logic, keep legacy/experimental variants out of main workflow
- When designing nondeterministic contract logic, explain why the chosen equivalence principle is appropriate
- Categories use Spanish names in the contract/data: `deportes`, `clima`, `crypto`, `tech`, `cultura`, `custom`
- UI translations are in `messages/es.json` and `messages/en.json` — update both when adding UI strings
- The `VSData` type is a UI-friendly mapping of `ClaimData` with renamed fields (state "active" → "accepted", counter_position → opponent_position, etc.)
