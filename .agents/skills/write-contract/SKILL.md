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
- major contract refactors
- validator logic and equivalence-principle selection
- storage modeling and persisted type design
- LLM-hardening and response parsing
- production-safe GenLayer patterns instead of generic Python patterns

## Recommended workflow

1. Sketch the contract API and storage model.
2. Choose the equivalence principle before writing nondeterministic logic.
3. Add explicit error classification for validator comparison.
4. Keep persisted storage in GenLayer-native types.
5. Validate with `$genvm-lint`.
6. Add `$direct-tests`, then `$integration-tests` where environment behavior matters.

## Contract skeleton

```python
# { "Depends": "py-genlayer:test" }

from genlayer import *

class MyContract(gl.Contract):
    owner: Address
    items: TreeMap[str, str]
    item_order: DynArray[str]

    def __init__(self, initial_item: str):
        self.owner = gl.message.sender_account
        self.items = TreeMap()
        self.item_order = DynArray()
        self.items["initial"] = initial_item
        self.item_order.append("initial")
```

## Equivalence principle: which one to use

This is the most important contract design decision.

### Decision rule

- If every validator can reproduce the same normalized output exactly, use `strict_eq`.
- If raw outputs vary but validators can compare stable derived facts, prefer a custom validator function.
- If you are only experimenting with prompt-based comparison helpers, treat them as convenience wrappers, not the default production choice.

### `strict_eq`

Good fits:
- deterministic blockchain RPC calls
- stable REST responses that can be normalized exactly
- computations whose outputs can be canonicalized byte-for-byte

Bad fits:
- unstable pages
- raw HTML scraping
- free-form LLM prose

### Custom validator function

This is the usual production pattern for nondeterministic work:
- leader gathers messy or variable external data
- contract normalizes it into stable intermediate facts
- validator logic compares the facts, not the raw source

Choose this whenever validators cannot rely on exact raw output equality.

### Convenience wrappers

If you use helper patterns such as prompt-comparative wrappers, treat them as shortcuts for small experiments. For long-lived contracts, explicit validator logic is easier to audit, test, and harden.

## Error classification

Use stable prefixes so validator comparison can reason about the kind of failure:

```python
ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"
```

Practical intent:
- deterministic business-rule failures should match exactly
- deterministic external failures should match exactly when possible
- transient infrastructure failures can agree by category instead of exact wording
- malformed LLM outputs should fail loudly and clearly

Keep one small helper per error class instead of scattering raw string prefixes across the contract.

## Storage rules

Persisted storage should use GenLayer-native types:
- `TreeMap[K, V]` instead of plain `dict`
- `DynArray[T]` instead of plain `list`
- `u256` or `i256` for on-chain numeric work

Additional rules:
- declare storage fields as class-level annotations
- initialize persisted fields in `__init__`
- avoid persisting raw floats; store scaled integers or normalized strings instead
- use small structured helpers only when they remain compatible with GenLayer storage expectations

Keep storage layout explicit and easy to audit. Do not hide important persisted state inside ad hoc nested Python objects.

## LLM and JSON hardening

When prompting an LLM:
- prefer `response_format="json"` whenever supported
- validate the response shape before trusting it
- accept a small set of key aliases if the model may vary field names
- coerce numeric-like strings carefully
- clean malformed JSON only in tightly scoped, deterministic ways

Do not treat raw prose as trusted structured data.

## Agentic pattern: LLM-generated checks plus deterministic evaluation

For tasks where pure prompt inspection is unreliable:
1. use the LLM to propose a structured rubric or deterministic checks
2. evaluate those checks in normal code
3. feed the code-derived facts back into later scoring or decision logic

This pattern is especially useful for formatting rules, evidence scoring, or rich natural-language inputs where the final decision still needs deterministic anchors.

## Cross-contract and external interaction

When interacting with other contracts or remote data:
- keep read flows synchronous and explicit
- treat write flows as asynchronous transactions with receipts
- normalize third-party RPC or web results before comparison
- if using child-contract or factory patterns, keep deployment flow and address tracking simple

Never bury critical external assumptions inside opaque prompt text.

## Web requests

For web-dependent logic:
- extract stable fields instead of comparing full pages
- derive status from normalized values, not presentation markup
- keep selectors or parsing logic narrow and testable
- assume headers, ordering, and whitespace may vary

If a page is too unstable for exact reproduction, that is a signal to use a custom validator flow.

## Anti-patterns

Avoid:
- using `strict_eq` on raw HTML or raw LLM prose
- persisting floats directly
- mixing business-rule failures with transient infrastructure failures
- storing large blobs of raw external data when only normalized facts are needed
- relying on one prompt with no structured validation layer

## Testing strategy

After contract edits:
1. run `$genvm-lint`
2. add focused `$direct-tests` for business logic and parsing
3. add `$integration-tests` only when validator flow or real environments matter

The deliverable should usually include:
- the contract file changes
- a short explanation of the chosen equivalence principle
- any explicit error-prefix strategy
- lint status
- the first recommended test cases
