---
name: genvm-lint
description: Lint, validate, schema-extract, and typecheck GenLayer intelligent contracts before tests or deployment.
---

# GenVM Lint

Use this skill whenever a task involves modifying, reviewing, or debugging a GenLayer intelligent contract.

## When to use

Use this skill for:
- linting or validating a contract after edits
- extracting ABI/schema from a contract
- typechecking contracts with SDK-aware paths
- iterative fix loops before adding tests
- diagnosing whether a failure is caused by contract structure vs. runtime behavior

## Core rule

Always lint before testing. Run `genvm-lint check` after writing or modifying a contract, fix all reported issues, and only then move to direct or integration tests.

## Setup

Requires `genvm-linter`:

```bash
pip install genvm-linter
```

## Recommended workflow

1. Run `genvm-lint check <contract> --json` when you need structured output.
2. Categorize failures into:
   - AST safety or forbidden imports
   - SDK semantic errors
   - typing issues
3. Fix the contract with minimal changes.
4. Re-run until `"ok": true`.
5. Only then move to tests.

## Commands

### check (recommended)

```bash
genvm-lint check contracts/my_contract.py
genvm-lint check contracts/my_contract.py --json
```

`check` runs both lint and validate in one pass.

### lint (fast AST checks only)

```bash
genvm-lint lint contracts/my_contract.py
```

Typical catches:
- forbidden imports (`os`, `sys`, `subprocess`, `random`, etc.)
- nondeterministic patterns
- malformed contract header structure

### validate (SDK semantic checks)

```bash
genvm-lint validate contracts/my_contract.py
```

Typical catches:
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

## Output formats

### Human

```text
✓ Lint passed (3 checks)
✓ Validation passed
  Contract: MyContract
  Methods: 8 (5 view, 3 write)
```

### JSON

```json
{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"MyContract","methods":8,"view_methods":5,"write_methods":3,"ctor_params":2}}
```

## Exit codes

- `0` — all checks passed
- `1` — lint or validation errors found
- `2` — contract file not found
- `3` — SDK download failed

## Fix loop guidance

When you are asked to “make the contract pass lint”:
- start with `genvm-lint check ... --json`
- fix concrete issues first, not style-only concerns
- keep behavior changes separate from structural fixes
- summarize which errors were resolved and which remain
