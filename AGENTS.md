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

- Use `$validator-manage` for:
  - validator join, funding, and identity operations
  - listing validators and checking validator status on a network
  - organizing owner and operator accounts across testnets

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

- Use `$boy-scout` for:
  - opportunistic cleanup while touching existing Python files
  - small, proportional code-quality improvements during bug fixes or refactors

- Use `$python-clean-code` for:
  - Python refactor or cleanup requests
  - Python clean-code reviews focused on maintainability and readability

- Use `$clean-tests` for:
  - Python test-quality cleanup
  - improving boundary coverage, speed, and clarity in existing tests

## Bradbury testnet known issues

- **`gl.message.value` always returns `0`** on Bradbury. The GenVM does not relay the EVM transaction value to the contract. Do NOT use `gl.message.value` for stake/value validation. Trust the `stake_amount` argument instead — the EVM layer still transfers GEN correctly.
- **When debugging failed transactions**, use the **EVM Transaction hash** (not the GenLayer Chain Transaction Hash). Query with `client.getTransaction({ hash: '<EVM_TX_HASH>' })`. Check `txExecutionResultName`: `FINISHED_WITH_RETURN` = success, `FINISHED_WITH_ERROR` = contract error.
- **All validators voting DISAGREE** with the same `validatorResultHash` means they all reached the same error — consensus was reached on a `UserError`. This is normal, not a consensus failure.
- **UTF-8 mojibake in the explorer** (e.g. `Â¿Llueve maÃ±ana`) is a display bug. The on-chain data is correctly encoded.
- **If all write methods fail but reads work**, the deployed contract binary may be incompatible with the current GenVM. Redeploy with `genlayer deploy --contract contracts/proven.py` and update `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`.

## Working rules

- Run `$genvm-lint` after every contract change and before any new tests.
- Prefer `$direct-tests` first; escalate to `$integration-tests` only when environment or consensus behavior matters.
- For this repo, prefer the npm wrappers for the contract workflow:
  - `npm run contract:check`
  - `npm run test:direct`
  - `npm run test:integration:localnet`
  - `npm run test:integration:studionet`
  - `npm run contract:stage`
- Use `$genlayer-cli` instead of ad hoc RPC commands when the task is ordinary deploy/call/write/receipt work.
- Use `$validator-manage` instead of ad hoc staking commands when the task is operational validator management rather than node installation.
- For built-in GenLayer networks, use `genlayer network set` rather than forcing `--rpc`.
- For validator upgrades, follow the zero-downtime approach in `$genlayernode` and do not stop the old node until the new one is prepared.
- When designing nondeterministic contract logic, explicitly explain why the chosen equivalence principle is appropriate.
- When updating PROVEN contract logic, treat `contracts/proven.py` as the source of truth and keep legacy or experimental variants out of the main workflow unless explicitly requested.
- When adding research artifacts such as `deep-research-report.md`, reconcile them against `contracts/proven.py`, `lib/contract.ts`, and the live UI flows before treating the document as current.
- Treat external legal or regulatory claims in research artifacts as provisional unless they are independently verified close to ship time.
- Prefer clean ASCII markdown for repo-internal research notes and remove copied citation artifacts or browsing markup before committing them.
