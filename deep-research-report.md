# PROVEN - Betting Theory and Game Design Review

## Purpose

This memo reviews the original research draft against the code currently in this repo and reframes it as a practical design note for PROVEN as it exists today.

Source of truth for implementation:

- Contract: `contracts/proven.py`
- Client wrapper: `lib/contract.ts`
- Create flow: `app/[locale]/vs/create/page.tsx`
- Detail flow: `app/[locale]/vs/[id]/page.tsx`

## What PROVEN is now

PROVEN is no longer just a "one creator vs many challengers pool bet."

In the current codebase, PROVEN is a claim-based market engine with three important degrees of freedom:

1. Participation format
   - `max_challengers = 1` gives classic head-to-head.
   - `max_challengers > 1` gives 1-vs-many.

2. Pricing model
   - `odds_mode = "pool"` behaves like an asymmetric two-sided pari-mutuel pool.
   - `odds_mode = "fixed"` behaves more like creator-posted liquidity offering a fixed challenger payout.

3. Settlement model
   - `market_type` can be `binary`, `moneyline`, `spread`, `total`, `prop`, or `custom`.
   - `handicap_line` and `settlement_rule` let the claim define custom grading logic.

There is also a built-in rivalry layer:

- `parent_id` links related claims
- `create_rematch(...)` creates a new claim from an earlier one
- `get_rivalry_chain(...)` reconstructs the series

So the best short label for the current product is:

**"An AI-settled claim market supporting head-to-head, 1-v-many, pool-odds, fixed-odds, and rivalry-linked rematches."**

## Betting theory classification

### Pool mode

When `odds_mode = "pool"`, PROVEN is closest to a two-outcome pari-mutuel pool with asymmetric participation.

Let:

- creator stake = `C`
- total challenger stake = `S`
- total pot = `C + S`

Then:

- if creator wins, creator receives `C + S`
- if challengers win, each challenger receives `stake + proportional share of C`

That is standard pool-bet logic. The crowd determines the payout by where money lands.

### Fixed-odds mode

When `odds_mode = "fixed"`, PROVEN is not pari-mutuel anymore.

In the current contract:

- each challenger's gross payout is `stake * challenger_payout_bps / 10000`
- the contract reserves creator liability as challengers join
- if challengers win, they are paid at that fixed rate
- any unused creator stake is returned to the creator

That means PROVEN now spans two different economic models:

- pool pricing
- creator-backed fixed pricing

This is an important update because the original research draft framed the product as only pari-mutuel. That is now incomplete.

## What the current contract already gets right

The current implementation in `contracts/proven.py` already solves several important structural issues:

### 1. Creator self-challenge is blocked

The creator cannot challenge their own claim from the same wallet:

- `challenge_claim(...)` rejects `gl.message.sender_address == claim.creator`

This does not stop multi-wallet sybil behavior, but it does close the simplest same-wallet exploit.

### 2. 1-v-many is a first-class primitive

The product is not faking "many challengers" at the UI level. The contract stores:

- challenger addresses
- challenger stakes
- challenger count
- max challengers

This is the right base for open arena claims.

### 3. Fixed odds are liquidity-aware

For fixed-odds claims, the contract reserves creator liability on every challenger join. That is good design:

- it prevents promising more payout than the creator can fund
- it makes fixed odds safer than a naive "trust me" model

### 4. Rematches are modeled cleanly

Rivalry is not a frontend-only concept. It is encoded onchain through `parent_id`, which is the right long-term design.

### 5. Draw / unresolved outcomes refund instead of forcing a bad settlement

If the AI verdict is `draw` or `unresolvable`, the contract returns funds rather than forcing an arbitrary winner. For a product using web+AI settlement, that is the correct bias.

## Main gaps between theory and current implementation

These are the most important remaining issues after comparing the report with the actual code.

### 1. No lock window before information becomes public

This is still the biggest game integrity risk.

The contract has a `deadline`, but it does not enforce:

- event start time
- market close before public observability
- a pre-resolution lock window

So users can still create poorly timed markets where late challengers have too much informational advantage.

Recommended next step:

- add `event_time`
- require `deadline <= event_time - buffer`
- stop new challenges during the final lock window

### 2. No meaningful minimum stake or anti-dust controls

The contract only requires stake to be greater than zero.

That is mathematically valid but poor marketplace hygiene. It invites:

- spammy tiny challenges
- dust challenger joins
- noisy demo data

Recommended next step:

- set a minimum stake
- optionally enforce simple step sizes

### 3. Oracle ambiguity is still the hardest real risk

The report was right about oracle risk, and the current code still reflects that exposure.

Today the contract allows:

- free-form `resolution_url`
- free-form `settlement_rule`
- free-form `handicap_line`

That flexibility is good for expression, but risky for reliable settlement.

Recommended next step:

- add category-specific resolution templates
- whitelist a few demo-safe source patterns
- require more structured market metadata for sports and price markets

### 4. Pool extremes are still possible

In pool mode, the payout math is coherent, but thin or lopsided pools can still produce wild optics.

That is not a bug, but it can feel broken in a demo.

Recommended next step:

- optionally cap challenger capacity by ratio, not only by count
- optionally require minimum opposing participation before resolution

### 5. No fee or spam-bond strategy yet

The current contract has no rake, no creator bond, and no spam tax.

That is fine for a hackathon demo, but not for a durable public arena. If PROVEN stays fully open, low-quality claims will eventually flood the feed.

Recommended next step:

- keep 0% fee for demo simplicity
- later add either:
  - winner-only commission on profit, or
  - creator posting bond, or
  - both

### 6. `created_at` is not populated meaningfully

In the current contract, `created_at` is still written as `0`.

This does not break settlement, but it weakens:

- sorting
- analytics
- rivalry chronology
- future indexer quality

Recommended next step:

- set a real timestamp if GenLayer gives you a safe source
- otherwise set it in your off-chain index layer for UI ordering

## Product implications by feature

### Rivalry / rematch

This feature is conceptually strong and already modeled correctly onchain.

Best positioning:

- rivalry is social continuity, not stake escalation
- rematches should be optional and bounded
- the "series score" is the main reward

Good next move:

- add "best of 3" or "series record" at the UI/indexer layer
- do not add automatic double-or-nothing mechanics

### Odd bets and custom handicaps

This is one of the strongest differentiators in the current contract.

Why it matters:

- it makes PROVEN feel broader than a yes/no challenge app
- it lets the same market engine cover sports spreads, totals, props, and custom claims

But it also raises the settlement burden:

- every extra degree of freedom makes ambiguous grading more likely

That means custom terms are powerful, but they should eventually be more structured than raw text.

### 1 vs several

This is already a real feature, not a mockup.

The key design question is not "should it exist?" but "how open should it be?"

Two useful control levers already exist:

- `max_challengers`
- `odds_mode`

That gives PROVEN a nice spectrum:

- 1v1 fixed-odds duel
- 1v1 pool bet
- 1vmany pool arena
- 1vmany fixed-odds liquidity offer

That flexibility is a strength, but the app should keep surfacing the mode clearly so users understand what they are joining.

## What the frontend now reflects

After the current UI changes, the app is much closer to the contract:

- create page now exposes advanced terms
- rematch creation is wired from the detail page
- detail page shows challenger roster, rivalry chain, market type, odds mode, settlement rule, and challenger capacity
- join flow now accepts variable challenger stake instead of forcing a strict mirror of creator stake

That means the app and contract are now directionally aligned.

Remaining gap:

- some list/card surfaces are still simplified for scanning
- a persistent indexer/database would still help for richer filtering and rivalry/history queries

## Recommended short roadmap

If the goal is a stronger demo with minimum surface area, this is the order I would prioritize:

1. Keep current unified contract model.
2. Redeploy `contracts/proven.py` and update `NEXT_PUBLIC_CONTRACT_ADDRESS`.
3. Add a lock-window / event-time rule.
4. Add minimum stake.
5. Add source templates for sports / crypto / weather claims.
6. Add lightweight series stats for rivalry.
7. Add fee or spam-bond only after the core UX feels trustworthy.

## Recommended one-paragraph product framing

PROVEN is an AI-settled claim market where users stake on verifiable outcomes and the protocol resolves the result from explicit market terms, evidence sources, and validator consensus. A claim can run as a head-to-head duel or a 1-v-many arena, using either pool odds or creator-backed fixed odds, and every rematch can be linked into an onchain rivalry chain. The core experience is not just "betting on a result" but publicly pricing conviction: if you are right against the crowd, the payout reflects it; if a market is ambiguous, the protocol should refund rather than fake certainty.

## Practical conclusion

The original research direction was useful, but the repo has outgrown its initial framing.

Today PROVEN should be designed and explained as:

- a unified claim engine
- with multiple market types
- multiple pricing modes
- multiple challenger formats
- and rivalry-linked rematches

That is a stronger product story than "one creator versus many challengers," and the code already supports most of it.
