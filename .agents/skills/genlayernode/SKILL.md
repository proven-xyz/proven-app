---
name: genlayernode
description: Install, upgrade, and monitor a GenLayer validator node on AMD64 Linux, including zero-downtime updates and LLM provider setup.
---

# GenLayer Validator Node

Use this skill for GenLayer validator node work on Linux, especially fresh installs, upgrades, and monitoring changes.

## When to use

Use this skill for:
- first-time validator setup
- zero-downtime upgrades
- `.env` and `config.yaml` generation or repair
- operator key import / generation
- WebDriver and Alloy monitoring setup
- troubleshooting validator prerequisites and startup issues

## Operating rules

### 1) Start with an overview

Before any install or upgrade task, first show the full step sequence that will be performed.

The overview should cover:
1. environment and access method
2. prerequisite checks
3. wallet / validator status
4. download and extract
5. environment and node config
6. operator key setup
7. WebDriver / doctor checks
8. deployment method
9. verification
10. optional monitoring

### 2) Explain each major step before running it

Before executing a major step, summarize:
- what will change
- which files or services are affected
- whether the step is reversible
- whether there is downtime risk

### 3) Fresh install vs update

Identify whether the task is:
- a fresh install, or
- an update of an existing validator

For updates, follow the zero-downtime procedure in `references/update-procedure.md` and never stop the old node until the new version is fully prepared.

## Mandatory checks

Confirm these before proceeding:
- Linux on `x86_64` / `amd64`
- at least 16 GB RAM
- enough free disk
- Node.js 18+
- Docker + `docker compose`
- Python 3 + `pip3`
- reachable GenLayer RPC and WebSocket endpoints

See:
- `references/validation-checks.md`
- `references/sharp-edges.yaml`
- `references/pre-update-checklist.md`

## Main references

- `references/install-procedure.md`
- `references/update-procedure.md`
- `references/common-procedures.md`
- `references/monitoring-procedure.md`
- `references/pre-update-checklist.md`
- `references/staking-wizard-procedure.md`

## High-risk reminders

- Zero-downtime updates matter: prepare first, then quick switch.
- For patch updates, use the shared database structure instead of copying DBs.
- If the LLM provider key exists but the provider is not enabled in the GenVM config, the node may fail with `module_failed_to_start`.
- After symlink switching during upgrades, restart Alloy if its bind mount becomes stale.
- Do not claim monitoring is healthy until metrics/log shipping is actually verified.

## Preferred workflow

1. Determine environment and whether the task is install or update.
2. Run prerequisite and edge-case checks.
3. Read the matching reference procedure.
4. Draft or execute commands in small, verifiable phases.
5. Verify health, sync status, and monitoring after the change.
6. Summarize final state, unresolved risks, and rollback path if relevant.
