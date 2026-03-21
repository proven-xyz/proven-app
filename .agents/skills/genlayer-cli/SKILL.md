---
name: genlayer-cli
description: Deploy, interact with, inspect, and debug GenLayer intelligent contracts with the GenLayer CLI across local Studio, hosted Studio, and testnet.
---

# GenLayer CLI

Use this skill when a task requires the `genlayer` CLI for network selection, account management, contract deployment, contract interaction, or transaction debugging.

## When to use

Use this skill for:
- setting or checking the active GenLayer network
- creating, importing, switching, or funding accounts
- deploying a contract or running deploy scripts
- calling view methods and sending write transactions
- inspecting schemas, code, and receipts
- debugging failed or unexpected transactions

## Core safety rules

### Use `genlayer network set` for built-in networks

For built-in networks, prefer:

```bash
genlayer network set
genlayer network set testnet-bradbury
```

Do **not** default to `--rpc` for built-in networks. That can bypass chain-specific configuration and break transaction polling.

Built-in networks from the source skill:
- `localnet`
- `studionet`
- `testnet-asimov`
- `testnet-bradbury`

### Headless and CI caveat

`genlayer account unlock` depends on an OS keychain and often fails in containers or headless agents. In those cases, expect password prompts for signing commands or pipe the password through stdin when automation is needed.

## Setup

```bash
npm install -g genlayer
```

## High-value commands

### Network

```bash
genlayer network set
genlayer network info
genlayer network list
```

### Accounts

```bash
genlayer account
genlayer account list
genlayer account create --name dev1
genlayer account use dev1
genlayer account import --name imported --private-key 0x...
genlayer account import --name imported --keystore ./keystore.json
genlayer account send 0x123...abc 10gen
```

### Deploy and interact

```bash
genlayer deploy --contract contracts/my_contract.py
genlayer deploy --contract contracts/my_contract.py --args "arg1" 42

genlayer call 0x123...abc get_data --args "key1"
genlayer write 0x123...abc set_data --args "hello"

genlayer schema 0x123...abc
genlayer code 0x123...abc
```

### Receipts and debugging

```bash
genlayer receipt <txHash>
genlayer receipt <txHash> --stdout
genlayer receipt <txHash> --stderr
genlayer receipt <txHash> --status FINALIZED
genlayer appeal <txHash>
```

## Recommended debugging workflow

When a deploy or write call behaves unexpectedly:

1. Fetch the receipt, preferably with stdout and stderr.
2. Confirm the contract schema and method signatures.
3. Read the deployed code if the local and deployed code may differ.
4. Run a read call to inspect current state.
5. Appeal only when the receipt indicates a result worth challenging.

## Local Studio management

```bash
genlayer init
genlayer up
genlayer up --reset-db
genlayer stop
```

For validator-heavy local work, localnet validator management commands from the original skill can be used from the reference file.

## Funding note

Fresh testnet accounts start with zero GEN. The original source skill points to the GenLayer testnet faucet and notes that faucet claiming is manual because of Cloudflare Turnstile. See `references/original-claude-skill.md`.
