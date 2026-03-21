# PROVEN. ⚡

**1v1 prediction challenges — AI settles it automatically.**

> Built for [Aleph Hackathon 2026](https://aleph.crecimiento.build) — GenLayer Track + PL\_Genesis

---

## ¿Qué es PROVEN?

PROVEN te permite desafiar a cualquiera a una apuesta sobre hechos verificables — deportes, clima, crypto, cultura pop. Apostá, compartí un link, y cuando se cumple el deadline, un **Intelligent Contract** lee la web, validadores de IA verifican el resultado, y el ganador cobra automáticamente.

**Sin árbitros. Sin discusiones. Sin esperar.**

---

## ¿Cómo funciona?

1. **Desafiá** — Escribí tu apuesta, elegí cuánto apostás
2. **Mandá el link** — Tu rival lo abre y acepta
3. **PROVEN decide** — El contrato busca pruebas en la web y la IA emite el veredicto
4. **Cobrado** — El ganador recibe los fondos al instante

---

## Product Positioning

PROVEN is an AI-settled claim market, not just a 1v1 betting app.

The current product supports:

- head-to-head claims and `1 vs many` open arenas
- pool odds and creator-backed fixed odds
- binary, moneyline, spread, total, prop, and custom markets
- custom handicap lines and settlement rules
- rivalry-linked rematches through onchain parent/child claims

The core idea is simple: users publicly price conviction around a verifiable outcome, and PROVEN resolves it from explicit market terms, evidence sources, and validator consensus.

Related internal docs:

- `deep-research-report.md`
- `implementation-checklist.md`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | GenLayer Intelligent Contract (Python) — Bradbury testnet |
| Consensus | Optimistic Democracy + Equivalence Principle |
| Web Verification | `gl.nondet.web.get()` — real-time web data |
| AI Evaluation | `gl.nondet.exec_prompt()` — LLM verdict |
| Frontend | Next.js 14 + React + Tailwind CSS |
| Wallet | MetaMask via genlayer-js SDK |

---

## Architecture

```
┌──────────────────────────────────────┐
│           FRONTEND (Vercel)          │
│        Next.js + Tailwind + React    │
│                                      │
│  Create VS → Share → Accept → Resolve│
│              genlayer-js SDK         │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│      GENLAYER BRADBURY TESTNET       │
│                                      │
│  ┌──────────────────────────────┐    │
│  │    PROVEN Intelligent Contract│    │
│  │                              │    │
│  │  create_claim() ← lock stake │    │
│  │  challenge_claim() ← join   │    │
│  │  resolve_claim():           │    │
│  │    ├─ gl.nondet.web.get()   │    │
│  │    ├─ gl.nondet.exec_prompt()│   │
│  │    └─ emit_transfer → winner│    │
│  │  cancel_claim() ← refund    │    │
│  └──────────────────────────────┘    │
│                                      │
│  Optimistic Democracy consensus      │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│        EXTERNAL WEB SOURCES          │
│  BBC Sport · ESPN · weather.com      │
│  CoinGecko · Google · news sites     │
└──────────────────────────────────────┘
```

---

## Contract Address

```
BRADBURY: [SET AFTER DEPLOYMENT]
```

---

## Project Structure

```
proven/
├── contracts/
│   └── proven.py              # GenLayer Intelligent Contract
├── deploy/
│   └── deploy.ts              # Deploy to Bradbury testnet
├── app/
│   ├── layout.tsx             # Root layout + providers
│   ├── page.tsx               # Landing — hero VS + open previews
│   ├── vs/
│   │   ├── create/page.tsx    # Create VS form
│   │   └── [id]/page.tsx      # VS detail — accept/resolve/result
│   ├── explore/page.tsx       # Browse open VS with filters
│   └── dashboard/page.tsx     # My VS — tabs + stats
├── components/
│   └── Header.tsx             # Nav + wallet
├── lib/
│   ├── genlayer.ts            # Client config
│   ├── contract.ts            # Typed contract interface
│   ├── wallet.tsx             # Wallet context
│   ├── constants.ts           # Categories, helpers
│   └── hooks.ts               # useCountdown
├── public/
├── tailwind.config.ts
├── .env.example
└── README.md
```

---

## Repo-Local Codex Skills

This repo includes repo-local Codex skills for GenLayer workflows under `.agents/skills/`, with usage guidance in `AGENTS.md`.

Useful entry points:

- `$write-contract` for new contract work and major contract refactors
- `$genvm-lint` for contract validation before tests or deployment
- `$genlayer-cli` for network, deploy, call, write, and receipt workflows
- `$direct-tests` for fast logic checks
- `$integration-tests` for localnet, Studio, or testnet validation
- `$genlayernode` for validator and node operations

Recommended flow:

1. Use `$write-contract` for large contract design or refactors
2. Run `$genvm-lint` after every contract change
3. Start with `$direct-tests`
4. Escalate to `$integration-tests` only when environment or consensus behavior matters

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js 18+**
- **npm** or **yarn**
- **MetaMask** browser extension

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_TEAM/proven.git
cd proven
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_YOUR_DEPLOYED_ADDRESS
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

If you see random chunk errors in dev (for example `Cannot find module './36.js'` from `next/dist/server/require-hook.js`), start with a clean cache:

```bash
npm run dev:clean
```

Or manually:

```bash
npm run clean
npm run dev
```

---

## Deploy the Smart Contract

### Option A: GenLayer Studio (fastest for testing)

1. Open [studio.genlayer.com](https://studio.genlayer.com)
2. Paste the contents of `contracts/proven.py`
3. Deploy — you'll get a contract address
4. Copy that address into your `.env.local`

### Option B: CLI Deploy to Bradbury

```bash
# Fast CLI deploy using the active GenLayer account and network
npm run deploy:contract
```

Useful variants:

```bash
# Force Bradbury first, then deploy contracts/proven.py
npm run deploy:contract:bradbury

# Deploy and sync NEXT_PUBLIC_CONTRACT_ADDRESS into .env.local
npm run deploy:contract:env

# Pass constructor args through to genlayer deploy
npm run deploy:contract -- --args "hello" 42
```

The wrapper uses the active `genlayer` CLI account and network, defaults to `contracts/proven.py`, and can optionally update `.env.local`.

### Option C: SDK Deploy Script

If you prefer the older private-key-based script:

```bash
# Set your private key
export DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Deploy with genlayer-js
npm run deploy:contract:sdk
```

### Getting Testnet Tokens

- Join [GenLayer Discord](https://discord.gg/8Jm4v89VAu)
- Use the `#faucet` channel to get Bradbury testnet tokens
- Or use GenLayer Studio which provides test accounts with tokens

---

## Deploy the Frontend (Free)

### Option 1: Vercel (recommended — free)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repo
4. Add environment variable:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` = your deployed contract address
5. Deploy — you'll get a `your-app.vercel.app` URL in ~60 seconds

```bash
# Or use Vercel CLI
npm i -g vercel
vercel --prod
```

### Option 2: Netlify (free)

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. New site → Import from Git
4. Build command: `npm run build`
5. Publish directory: `.next`
6. Add env var: `NEXT_PUBLIC_CONTRACT_ADDRESS`

### Option 3: Cloudflare Pages (free)

1. Push to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connect repo
4. Framework preset: Next.js
5. Add env var: `NEXT_PUBLIC_CONTRACT_ADDRESS`

### Option 4: Railway (free tier)

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

Add env var in Railway dashboard.

---

## Testing the Contract

### In GenLayer Studio

1. Deploy `contracts/proven.py`
2. Call `create_claim` with value (stake amount)
3. Switch accounts, call `challenge_claim`
4. Call `resolve_claim` — watch the AI verdict

### Local with GLSim

```bash
pip install genlayer-test[sim]
glsim --port 4000 --validators 5
```

Then point your frontend to `http://localhost:4000/api`:
```
NEXT_PUBLIC_GENLAYER_RPC=http://localhost:4000/api
```

---

## Demo Flow for Hackathon Video

1. Open the app → Show the landing with open VS
2. Connect wallet
3. Create a VS: "¿Argentina le gana a Brasil?" with $5 stake
4. Copy the link → Show WhatsApp share
5. Switch to opponent perspective → Accept the VS
6. Show the countdown + locked funds
7. Trigger resolution → Terminal animation plays
8. **PROVEN.** stamp slams in → Winner announced → Funds released
9. Show the Explore page with open VS from other users

**Use a bet that already happened** (yesterday's match) so the web data is available and resolution works reliably.

---

## Why GenLayer?

PROVEN is the **canonical use case** for Intelligent Contracts:

- The contract **reads the web** (`gl.nondet.web.get`) to find real results
- An LLM **judges the outcome** (`gl.nondet.exec_prompt`)
- Multiple validators independently verify via **Optimistic Democracy**
- The **Equivalence Principle** ensures consensus even with different AI phrasing
- No oracle. No committee. **The blockchain itself decides.**

No other chain can do this natively.

---

## Team

- TODO: Your names

---

## Built for

Aleph Hackathon 2026 — GenLayer Track + PL\_Genesis

---

## License

MIT
