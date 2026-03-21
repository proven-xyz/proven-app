---
name: write-contract
description: Design, write, and harden GenLayer intelligent contracts, including equivalence-principle choice, validator logic, storage modeling, LLM error handling, and production-safe contract patterns.
---

# Write Intelligent Contract

Use this skill when creating a new GenLayer contract or making substantial logic changes to an existing one.

## Core rule

After writing or modifying a contract, run `$genvm-lint` before adding or updating tests.

## When to use

Use this skill for:
- new intelligent contracts
- redesigning validator logic
- choosing between deterministic and nondeterministic patterns
- modeling persisted storage
- improving LLM resilience and parsing
- applying GenLayer-specific production patterns instead of generic Python patterns

## Recommended workflow

1. Sketch the contract API and storage model.
2. Choose the right equivalence principle before writing the core nondeterministic logic.
3. Add explicit error classification for validator comparison.
4. Keep storage fields in GenLayer-native types.
5. Run `$genvm-lint`.
6. Add `$direct-tests`, then `$integration-tests` where needed.

## Contract skeleton

```python
# { "Depends": "py-genlayer:test" }

from genlayer import *

class MyContract(gl.Contract):
    owner: Address
    items: TreeMap[str, Item]
    item_order: DynArray[str]

    def __init__(self, param: str):
        self.owner = gl.message.sender_account
```

## Equivalence-principle choice

This is the most important design decision.

### Use `strict_eq` when outputs can be reproduced exactly

Good fits:
- deterministic blockchain RPC calls
- stable REST responses that can be normalized
- outputs that can be canonicalized exactly

Do **not** use `strict_eq` for unstable pages or LLM calls.

### Prefer a custom validator function for most nondeterministic work

When validators cannot reliably reproduce the exact same raw output, use a leader function plus explicit validator comparison logic. This is usually the safest production pattern.

The original skill also mentions `prompt_comparative` and `prompt_non_comparative` convenience wrappers, but recommends custom validator logic for most real contracts.

## Error classification

Use consistent prefixes so validators compare the right kinds of failures correctly:

```python
ERROR_EXPECTED  = "[EXPECTED]"
ERROR_EXTERNAL  = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM       = "[LLM_ERROR]"
```

Practical intent:
- deterministic business errors should match exactly
- deterministic external 4xx-style errors should match exactly
- transient failures can agree by category
- LLM-format failures should generally force disagreement and retry

## Storage rules

Prefer GenLayer-native persisted types:
- `TreeMap[K, V]` instead of plain `dict`
- `DynArray[T]` instead of plain `list`
- `u256` or `i256` for on-chain numeric work
- strings for enum-like persisted values unless you have a stronger repo convention

Storage fields belong as class-level type annotations, then get initialized in `__init__`.

## LLM resilience

Use `response_format="json"` when prompting the model, but still validate shape and coerce fields defensively.

Good practices:
- accept a small set of key aliases when parsing
- coerce numeric-like strings safely
- fail with explicit prefixed errors
- normalize or clean malformed JSON before trusting it

## Agentic check pattern

The original skill includes a useful pattern for natural-language rule checking:
- use the LLM to generate deterministic Python checks
- evaluate those checks inside a sandbox
- feed the code-derived results back into a later LLM scoring step

This is a strong pattern when pure LLM inspection is unreliable, especially for character-level or formatting rules.

## Cross-contract and advanced patterns

For advanced sections such as cross-contract interaction, full validator error handlers, JSON cleanup helpers, and deeper production patterns, read `references/original-claude-skill.md`.

## Deliverable expectations

When using this skill, the result should usually include:
- the contract file changes
- a short explanation of the chosen equivalence principle
- any explicit error-prefix strategy
- confirmation that `$genvm-lint` passes or a list of remaining lint blockers
- the first recommended test cases
