# Safe Keeper Runbook

This runbook is for the founder or operator who will create the PROVEN keeper Safe.

Phase 0 only documents the process. It does not create the Safe, move funds, or change on-chain permissions.

## Purpose

Before PROVEN handles live-money flows, the keeper that signs operational transactions must be a 2-of-3 Safe, not a single EOA.

Use this Safe for future keeper duties such as payout approvals, bridge attestations, or emergency admin actions introduced in later phases.

## Target setup

- Owners: 3
- Threshold: 2 signatures required
- Safe address naming:
  - `PROVEN Keeper - Base Sepolia`
  - `PROVEN Keeper - Base Mainnet`
- One signer per human. No person should control more than one owner key.
- Prefer hardware-backed owner wallets for at least two of the three owners.

Safe's docs describe owners and threshold as the core security model, and Safe's help center explicitly recommends a threshold above 1 for operational safety.

Sources:
- https://docs.safe.global/advanced/smart-account-concepts
- https://help.safe.global/en/articles/40835-what-safe-setup-should-i-use
- https://help.safe.global/en/articles/40868-creating-a-safe-on-a-web-browser
- https://help.safe.global/en/articles/40834-verify-safe-creation

## Prerequisites

- Three owner wallet addresses agreed in advance
- Owner labels recorded in the team password manager or ops doc
- Safe app access: `https://app.safe.global/`
- Base Sepolia RPC access for the initial dry run
- Small amount of gas on the chosen network for Safe creation and the test transaction

## Creation steps

1. Prepare the three owner addresses.
2. Open `https://app.safe.global/` and connect one owner wallet.
3. Create a new Safe on Base Sepolia first.
4. Enter all three owner addresses.
5. Set the threshold to `2`.
6. Name the Safe `PROVEN Keeper - Base Sepolia`.
7. Deploy the Safe and record the Safe address immediately.
8. Repeat the same process on Base mainnet only when Phase 2 is ready for internal-funds testing.

## Dry-run checklist

After creation, do one harmless transaction on Base Sepolia:

1. Propose a transaction from owner A.
2. Confirm it from owner B.
3. Execute it only after the second confirmation is present.
4. Verify that owner A alone cannot execute before threshold is met.

Good dry-run options:

- transfer a dust amount of ETH between team-owned addresses
- call a no-op admin transaction on a throwaway contract
- send a small self-transfer back to the Safe

## Verification checklist

Confirm all of the following before calling the Safe ready:

- The Safe shows exactly 3 owners.
- The threshold is exactly 2.
- The Safe address is recorded in the ops docs.
- The creation transaction explorer link is saved.
- A 2-signature dry run was executed successfully.
- The team knows which two owners approved the dry run.

If you want an extra verification pass, Safe's help article recommends checking owner list and threshold against the creation transaction and on-chain state:

- https://help.safe.global/en/articles/40834-verify-safe-creation

## Repo follow-up

When the Safe exists, record these values outside git first:

- Safe address
- owner list
- threshold
- creation tx hash
- network

Only add the address to deployment env vars when the application code actually starts reading it.

For this repo, the placeholder to use later is:

- `SAFE_KEEPER_ADDRESS`

Do not put signer private keys in `.env.local`, `.env.example`, GitHub Actions secrets, or Vercel env vars.

## Operating rules

- Never use a single founder EOA as the live keeper once real funds are involved.
- Never let one person control more than one owner key.
- Keep at least one owner key off the daily-use machine.
- Treat owner rotation as a planned change with written approval.
- Re-run the dry-run checklist after any owner or threshold change.

## Incident response

If an owner key is lost, compromised, or inaccessible:

1. Stop shipping new live-money changes.
2. Do not increase risk by dropping to 1-of-1.
3. Rotate the affected owner through a Safe transaction.
4. Reconfirm the threshold after rotation.
5. Re-run the Base Sepolia dry run before resuming production changes.

## Definition of done

This Phase 0 item is complete when:

- the runbook exists in the repo
- the founder has created the Safe manually
- the owner list and threshold are documented
- the Sepolia dry run has succeeded
