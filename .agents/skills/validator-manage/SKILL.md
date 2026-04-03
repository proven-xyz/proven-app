---
name: validator-manage
description: Manage GenLayer validators across testnets using the GenLayer CLI. Join, fund, set identity, list, and organize validators per network and owner.
---

# Validator Manage

Use this skill when the task is operational validator management through the `genlayer` CLI rather than full node installation.

## When to use

Use this skill for:
- listing validators on a given network
- joining a new validator
- funding operator accounts
- setting validator identity or moniker
- organizing owner and operator accounts per network
- checking balances, epoch info, or validator status

## Prerequisites

Confirm these before proceeding:
- `genlayer` CLI is installed
- the active network is correct
- the relevant owner account exists locally
- the operator address is known or will be created

Useful checks:

```bash
genlayer --version
genlayer network list
genlayer network info
genlayer account list
```

## Key concepts

### Address roles

- owner controls validator settings, withdrawals, and identity changes
- operator runs the node and signs validator activity
- validator wallet is the on-chain validator contract created during join

### Network isolation

Each testnet has its own staking contract. A validator must be joined separately on each network. Reusing one owner across networks is common; reusing one operator across networks is usually not.

## Core safety rules

- use `genlayer network set` for built-in networks instead of forcing `--rpc`
- confirm the active account before sending stake or identity transactions
- do not confuse owner and operator responsibilities
- if the task is validator installation or upgrade, switch to `$genlayernode`

## Common operations

### Switch network

```bash
genlayer network set testnet-bradbury
genlayer network info
```

### List validators

```bash
genlayer staking validators
genlayer staking validator-info <validator-address>
```

### Join validator

```bash
genlayer staking validator-join \
  --amount "100000gen" \
  --operator <operator-address> \
  --account "<owner-cli-name>"
```

This returns the on-chain validator wallet address.

### Fund operator

```bash
genlayer account send <operator-address> <amount> --account "<owner-cli-name>"
```

### Set moniker or identity

```bash
genlayer staking set-identity <validator-address> \
  --moniker "Validator Name" \
  --account "<owner-cli-name>"
```

Use the owner account for identity updates, not the operator.

### Create a new operator account

```bash
genlayer account create --name "Validator Operator" --no-set-active
```

### Check balances and epoch info

```bash
genlayer account show --account "<name>"
genlayer staking epoch-info
```

## Recommended workflow

1. Set and confirm the target network.
2. Confirm which local account is the owner.
3. Create or identify the operator account for that network.
4. Perform the staking or identity operation.
5. Verify the result with validator info and balance checks.
6. Summarize the resulting owner, operator, validator wallet, and network.
