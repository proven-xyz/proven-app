# PROVEN Implementation Checklist

This checklist turns `deep-research-report.md` into concrete repo work.

Source of truth:

- Contract: `contracts/proven.py`
- Client wrapper: `lib/contract.ts`
- Create flow: `app/[locale]/vs/create/page.tsx`
- Detail flow: `app/[locale]/vs/[id]/page.tsx`

## Already Implemented

- [x] Unified claim engine instead of separate contracts
- [x] Head-to-head and `1 vs many` via `max_challengers`
- [x] Pool odds and fixed odds via `odds_mode`
- [x] Market typing via `market_type`
- [x] Custom handicap lines and settlement rules
- [x] Rivalry/rematch support via `parent_id` and `create_rematch(...)`
- [x] Public and private-link claim visibility
- [x] Advanced create UI for custom market terms
- [x] Detail UI for challenger list, market terms, and rivalry chain
- [x] Fast read layer and API cache for demo performance
- [x] Minimum stake enforcement in contract and UI

## High Priority Next

- [ ] Add event-time and lock-window rules to stop late information sniping
  - Suggested contract fields: `event_time`, `lock_window_seconds`
  - Suggested rule: challengers cannot join after `event_time - lock_window`

- [x] Tighten settlement templates for major categories
  - Sports: league, event, scoreboard rule
  - Crypto: source, timestamp, price rule
  - Weather: location, source, measurement rule

- [ ] Redeploy the updated contract and refresh envs
  - Local: update `NEXT_PUBLIC_CONTRACT_ADDRESS`
  - Vercel: update `NEXT_PUBLIC_CONTRACT_ADDRESS`

- [ ] Add a simple confidence/dispute policy for ambiguous resolutions
  - High confidence: settle normally
  - Medium confidence: flag as contested or dispute-eligible
  - Low confidence: refund as `unresolvable`

## Medium Priority

- [ ] Add ratio guardrails for extreme pool optics
  - Example: max challenger pool relative to creator stake
  - Example: per-user cap inside the challenger side
  - Example: minimum opposing liquidity before a claim is considered valid

- [ ] Improve oracle safety for free-form claims
  - Whitelist trusted demo-safe sources
  - Reduce ambiguous `resolution_url` usage where possible
  - Refund on low-confidence / conflicting-source cases

- [ ] Populate meaningful creation timestamps
  - Onchain if a safe timestamp source exists
  - Otherwise in the off-chain read model/index

- [ ] Add rivalry series metadata
  - Round number
  - Series score
  - "best of 3" style UI

- [ ] Improve public information design for thin pools
  - Keep exact payout math on detail pages
  - Prefer qualitative heat or challenger counts in broad discovery views
  - Consider implied probability as a secondary display, not a source of truth

## Growth and Marketplace Quality

- [ ] Decide on anti-spam economics
  - 0% fee for demo is fine
  - Later consider winner-only commission on profit
  - Or add a creator posting bond to discourage junk claims

- [x] Add claim quality nudges in the create flow
  - "too obvious"
  - "too vague"
  - "hard to verify"

- [ ] Avoid UI that overstates crowd certainty
  - Prefer payout multiples and pool terms
  - De-emphasize raw social counters as "truth"

- [ ] Add lightweight abuse monitoring to the index layer
  - repeated creator/challenger pairs
  - unusual win-rate patterns
  - clusters of private-link activity that look sybil-like

## Infrastructure

- [ ] Decide whether to keep the current cache-only read model or move to a real DB/indexer
  - Current demo path: `app/api/vs/*` + `lib/server/vs-cache.ts`
  - Scale path: Neon/Postgres + worker/indexer

- [ ] Prewarm the index before demos
  - `npm run warm:vs-index`

- [ ] Validate deploy flow end-to-end with the current Bradbury contract
  - `scripts/genlayer-deploy.mjs`
  - receipt recovery path
  - `.env.local` sync

## Suggested Build Order

1. Validate the current deploy flow end-to-end
2. Redeploy the current contract and update envs
3. Add lock window and event timing
4. Add confidence/dispute policy
5. Add ratio guardrails
6. Add rivalry series stats

## Demo MVP Notes

- Implemented in this branch:
  - public and private-link challenge modes
  - minimum stake enforcement in contract and UI
  - required verification source on claim creation
  - category-specific source and settlement guidance in the create flow
  - stronger default settlement guidance inside the contract prompt
  - pre-submit claim quality nudges for the demo

- Intentionally deferred for now:
  - onchain event-time / lock-window enforcement
  - confidence/dispute tiers beyond simple resolution confidence display
  - ratio caps and deeper economic guardrails
  - fee or creator-bond mechanics
