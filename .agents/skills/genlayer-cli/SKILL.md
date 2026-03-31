---
name: genlayer-cli
description: Deploy, interact with, inspect, and debug GenLayer intelligent contracts with the GenLayer CLI across local Studio, hosted Studio, and testnet.
---

# GenLayer CLI

Use this skill when a task requires the `genlayer` CLI for network selection, account management, deployment, contract interaction, or transaction debugging.

## When to use

Use this skill for:
- choosing or checking the active GenLayer network
- creating, importing, switching, or funding accounts
- deploying a contract or running deploy scripts
- calling view methods and sending write transactions
- inspecting schemas, deployed code, or receipts
- appealing or debugging failed transactions

## Core safety rules

### Use `genlayer network set` for built-in networks

For built-in networks, prefer:

```bash
genlayer network set
genlayer network set testnet-bradbury
```

Do not default to `--rpc` for built-in networks. That can bypass network-specific configuration and break transaction polling.

Typical built-in network names:
- `localnet`
- `studionet`
- `testnet-asimov`
- `testnet-bradbury`

### Headless and CI caveat

`genlayer account unlock` depends on an OS keychain and often fails in containers or headless agents. In those environments, expect password prompts for signing commands and verify automation flags against `genlayer --help` before scripting them.

## Setup

```bash
npm install -g genlayer
```

## Network configuration

```bash
genlayer network set
genlayer network set testnet-bradbury
genlayer network info
genlayer network list
```

## Account management

```bash
genlayer account
genlayer account list
genlayer account create --name dev1
genlayer account use dev1
genlayer account import --name imported --private-key 0x...
genlayer account import --name imported --keystore ./keystore.json
genlayer account send 0x123...abc 10gen
```

For validator operations, remember the role split:
- owner account controls validator settings and withdrawals
- operator account signs validator activity
- validator wallet is the on-chain contract address returned by staking

## Funding testnet accounts

Fresh testnet accounts usually start with zero GEN. Fund them before deploy or write operations. If the faucet requires a browser challenge, treat that step as manual and continue the scripted flow only after balance is confirmed.

## Contract deployment

Deploy a single contract:

```bash
genlayer deploy --contract contracts/my_contract.py
genlayer deploy --contract contracts/my_contract.py --args "arg1" 42
```

If the repo uses deploy scripts, prefer the repo's documented deployment flow instead of ad hoc commands.

## Contract interaction

Read methods:

```bash
genlayer call 0x123...abc get_data --args "key1"
```

Write methods:

```bash
genlayer write 0x123...abc set_data --args "hello"
```

Inspect a deployed contract:

```bash
genlayer schema 0x123...abc
genlayer code 0x123...abc
```

## Transaction debugging

```bash
genlayer receipt <txHash>
genlayer receipt <txHash> --stdout
genlayer receipt <txHash> --stderr
genlayer receipt <txHash> --status FINALIZED
genlayer appeal <txHash>
```

When a deploy or write call behaves unexpectedly:
1. Fetch the receipt, preferably with stdout and stderr.
2. Confirm the deployed schema and method signatures.
3. Read the deployed code if local and deployed sources may differ.
4. Run a read call to inspect current state.
5. Appeal only when the receipt shows a result worth challenging.

## Local Studio management

```bash
genlayer init
genlayer up
genlayer up --reset-db
genlayer stop
```

Use these when the task is ordinary local environment setup or reset, not full validator operations.

## Recommended workflow

1. Check or set the active network first.
2. Confirm the active account before any write or deploy.
3. Use repo-native deploy scripts when they exist.
4. After every write, inspect the receipt before assuming success.
5. If the issue is contract behavior rather than CLI usage, move to `$genvm-lint`, `$direct-tests`, or `$integration-tests` as appropriate.
