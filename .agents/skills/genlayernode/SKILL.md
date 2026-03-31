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
- operator key import or generation
- WebDriver and Alloy monitoring setup
- troubleshooting validator prerequisites and startup issues

## Mandatory operating rules

### 1. Start with a full overview

Before any install or upgrade task, first show the complete step sequence that will be performed. The overview should cover:
1. environment and access method
2. prerequisite checks
3. validator status and wallet artifacts
4. download and extract
5. environment and node config
6. operator key setup
7. WebDriver and doctor checks
8. deployment method
9. verification
10. optional monitoring

### 2. Explain each major step before running it

Before executing a major step, summarize:
- what will change
- which files or services are affected
- whether the step is reversible
- whether downtime risk exists

### 3. Separate fresh install from update

Identify whether the task is:
- a fresh install, or
- an update of an existing validator

For updates, follow the zero-downtime procedure in `references/update-procedure.md` and do not stop the old node until the new version is fully prepared.

### 4. Never expose secrets

Do not print API keys, passwords, or private key material into the chat. Use placeholders in generated files and have the user fill secrets locally on the target machine.

## Required start outline

Use a clear opening structure like:

```text
GenLayer validator work plan:
1. Determine environment and access method
2. Verify prerequisites
3. Decide install vs update
4. Download and prepare the target version
5. Configure .env and config.yaml
6. Set up the operator key
7. Start WebDriver and run doctor checks
8. Choose deployment method
9. Verify health and sync
10. Enable or verify monitoring if needed
```

## Zero-downtime update rule

Never use the slow pattern of stopping the old node first and then preparing the new release.

Preferred update shape:
1. download and extract the new version while the old node keeps running
2. run GenVM setup for the new version
3. prepare config, keystore access, and symlinks
4. stop the old process only when the new version is ready to take over
5. switch symlinks and restart quickly

Important reminders:
- for patch updates, prefer shared database layout over copying large databases around
- after symlink switches, restart Alloy if its bind mount becomes stale
- if the LLM provider key is present but the provider is not enabled in GenVM config, the node may fail with `module_failed_to_start`

## Environment and access

Determine where the validator will run before doing anything else:
- local machine
- remote Linux server over SSH
- cloud VM reached through provider tooling plus SSH

This choice affects:
- how commands are executed
- how files are copied
- how health checks are performed
- whether the user must run commands interactively on their own machine

If access is remote and not directly available from the current environment, provide the commands for the user rather than guessing.

## Requirements

Confirm these before proceeding:
- Linux on `x86_64` or `amd64`
- at least 16 GB RAM
- enough free disk for node data and logs
- Node.js 18+
- Docker plus `docker compose`
- Python 3 with `pip3`
- reachable GenLayer RPC and WebSocket endpoints
- validator wallet details and operator keystore path if reusing an existing validator

For deeper operational checklists, see:
- `references/pre-update-checklist.md`
- `references/sharp-edges.yaml`
- `references/common-procedures.md`

## Configuration notes

### `.env`

Start from the release example file when possible. Fill in:
- rollup RPC URL
- rollup WebSocket URL
- node password placeholder
- one LLM provider key placeholder

If you generate or repair `.env`, mask secrets in any displayed output.

### `config.yaml`

Start from the release example config when possible. Confirm:
- validator wallet address
- operator address
- RPC, ops, and admin ports
- metrics and health endpoints

### LLM provider enablement

Setting an API key is not enough. The matching provider must also be enabled in the GenVM LLM configuration. If the key and config disagree, the node may fail to boot.

## Preferred workflow

1. Determine environment and whether the task is install or update.
2. Run prerequisite and edge-case checks.
3. Read the matching reference procedure:
   - `references/install-procedure.md`
   - `references/update-procedure.md`
   - `references/staking-wizard-procedure.md`
   - `references/monitoring-procedure.md`
4. Download and extract the target version.
5. Run GenVM setup for that version.
6. Configure `.env` and `config.yaml`.
7. Import or generate the operator key.
8. Start WebDriver and run doctor checks.
9. Choose and configure the deployment method.
10. Verify health, sync, and monitoring.

## Mandatory checks

Useful commands:

```bash
uname -m
node --version
docker --version
docker compose version
python3 --version
pip3 --version
python3 -m venv --help
```

During verification:

```bash
cd /opt/genlayer-node && source .env && ./bin/genlayernode doctor check
curl -s http://localhost:9153/health
curl -s http://localhost:9153/metrics | grep genlayer_node_synced
```

## Deployment methods

Common options:
- systemd service for production-like operation
- Docker Compose when using the shipped compose setup
- manual `screen` or `tmux` only for short-lived debugging

Prefer the least surprising method already used on the target machine unless the user explicitly asks to migrate.

## Secret-handling rules

- Never `cat` or `grep` secrets and echo them back into the chat.
- Never ask the user to paste private keys or API keys into the conversation.
- If you must display environment status, show only whether a value is set, not the full value.
- When the user needs to edit secrets, instruct them to do it on the target machine and confirm after.

## Verification checklist

A node is not "done" until you verify:
- WebDriver is healthy
- `genlayernode doctor check` passes
- the process is running under the chosen deployment method
- the health endpoint responds
- sync metrics show progress or healthy steady state
- monitoring is actually shipping metrics or logs if Alloy was configured

## Reference documents

Main references in this repo:
- `references/install-procedure.md`
- `references/update-procedure.md`
- `references/common-procedures.md`
- `references/monitoring-procedure.md`
- `references/pre-update-checklist.md`
- `references/staking-wizard-procedure.md`

## High-risk reminders

- Zero-downtime updates matter: prepare first, then switch quickly.
- Keep the validator database layout stable across patch updates.
- Do not claim monitoring is healthy until metrics or logs are verified.
- Treat validator setup as operations work first and command execution second.
