# AGENTS.md

This repository uses repo-local Codex skills for GenLayer workflows.

## This repo

- Main intelligent contract: `contracts/proven.py`
- Contract client wrapper: `lib/contract.ts`
- Deploy script: `deploy/deploy.ts`
- GenLayer config: `gltest.config.yaml`

When contract method names, arguments, or return shapes change, keep `lib/contract.ts`, deployment flow, and related docs aligned.

## Skills to use

- Use `$genlayernode` for:
  - fresh GenLayer validator installs
  - validator upgrades and zero-downtime switchovers
  - LLM provider configuration
  - Alloy-based monitoring setup and validator operational checks

- Use `$genvm-lint` for:
  - linting or validating intelligent contracts
  - extracting schema / ABI
  - typechecking contracts before tests
  - iterative fix loops after contract edits

- Use `$direct-tests` for:
  - fast in-memory contract tests
  - mocking web requests or LLM calls
  - validating state transitions, access control, and expected reverts

- Use `$integration-tests` for:
  - contract smoke tests against GLSim, Studio, or testnet
  - consensus-sensitive debugging
  - validating behavior that direct mode does not cover

- Use `$genlayer-cli` for:
  - choosing or checking the active network
  - account creation, import, and switching
  - deployment, read/write interaction, receipts, and appeals
  - inspecting deployed schema or source code

- Use `$write-contract` for:
  - new intelligent contracts
  - major contract refactors
  - equivalence-principle selection
  - validator logic, storage modeling, and LLM-hardening patterns

## Working rules

- Run `$genvm-lint` after every contract change and before any new tests.
- Prefer `$direct-tests` first; escalate to `$integration-tests` only when environment or consensus behavior matters.
- Use `$genlayer-cli` instead of ad hoc RPC commands when the task is ordinary deploy/call/write/receipt work.
- For built-in GenLayer networks, use `genlayer network set` rather than forcing `--rpc`.
- For validator upgrades, follow the zero-downtime approach in `$genlayernode` and do not stop the old node until the new one is prepared.
- When designing nondeterministic contract logic, explicitly explain why the chosen equivalence principle is appropriate.
- When updating PROVEN contract logic, treat `contracts/proven.py` as the source of truth and keep legacy or experimental variants out of the main workflow unless explicitly requested.
- When adding research artifacts such as `deep-research-report.md`, reconcile them against `contracts/proven.py`, `lib/contract.ts`, and the live UI flows before treating the document as current.
- Prefer clean ASCII markdown for repo-internal research notes and remove copied citation artifacts or browsing markup before committing them.
