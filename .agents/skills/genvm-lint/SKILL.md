---
name: genvm-lint
description: Lint, validate, schema-extract, and typecheck GenLayer intelligent contracts before tests or deployment.
---

# GenVM Lint

Use this skill whenever a task involves modifying, reviewing, or debugging a GenLayer intelligent contract.

## When to use

Use this skill for:
- linting or validating a contract after edits
- extracting ABI or schema from a contract
- typechecking contracts with SDK-aware paths
- iterative fix loops before adding tests
- diagnosing whether a failure is caused by contract structure or runtime behavior

## Core rule

Always lint before testing. Run `genvm-lint check` after writing or modifying a contract, fix reported issues, and only then move to `$direct-tests` or `$integration-tests`.

## Setup

```bash
pip install genvm-linter
```

## In this repo

Prefer the repo wrapper when available:

```bash
npm run contract:check
```

## Workflow

1. Run `genvm-lint check <contract> --json` when you need structured output.
2. Split failures into lint, validate, and typecheck buckets.
3. Fix concrete contract issues with minimal behavior change.
4. Re-run until the result is clean.
5. Only then move to tests or deployment.

## Commands

### check

```bash
genvm-lint check contracts/my_contract.py
genvm-lint check contracts/my_contract.py --json
```

`check` runs lint and validate in one pass and should be the default starting point.

### lint

```bash
genvm-lint lint contracts/my_contract.py
```

Use this for fast AST-level checks such as:
- forbidden imports
- nondeterministic patterns
- malformed contract headers

### validate

```bash
genvm-lint validate contracts/my_contract.py
```

Use this for SDK semantic checks such as:
- invalid SDK types
- incorrect decorators
- invalid storage field types
- bad method signatures

### schema

```bash
genvm-lint schema contracts/my_contract.py
genvm-lint schema contracts/my_contract.py --json
genvm-lint schema contracts/my_contract.py --output abi.json
```

### typecheck

```bash
genvm-lint typecheck contracts/my_contract.py
genvm-lint typecheck contracts/my_contract.py --json
genvm-lint typecheck contracts/my_contract.py --strict
```

### download

```bash
genvm-lint download
genvm-lint download --version v0.2.12
genvm-lint download --list
```

Use `download` when the environment is missing GenVM artifacts.

## Output formats

Human output is useful for quick iteration:

```text
Lint passed
Validation passed
Contract: MyContract
```

JSON output is better for automated fix loops and method-shape inspection:

```json
{"ok":true,"lint":{"ok":true},"validate":{"ok":true}}
```

## Exit codes

- `0` means all checks passed
- `1` means lint, validation, or type errors were found
- `2` usually means the contract file was not found
- `3` usually means GenVM artifact download failed

## Agent workflow

When asked to "make the contract pass lint":
1. Start with `genvm-lint check ... --json`.
2. Fix concrete issues before style-only cleanup.
3. Keep behavior changes separate from structural fixes when possible.
4. Re-run until the contract is clean.
5. Summarize which checks passed and what remains blocked, if anything.
