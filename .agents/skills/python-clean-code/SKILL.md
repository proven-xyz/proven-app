---
name: python-clean-code
description: Use when the user explicitly wants Python cleanup, refactoring, or clean-code review. Apply broad Python code-quality guidance without taking over domain-specific GenLayer design or testing workflows.
---

# Clean Python: Complete Reference

Use this skill for comprehensive Python cleanup or review work. It is the broadest of the imported clean-code skills.

## In This Repo

- Use this skill for Python refactors, cleanup passes, and explicit clean-code review.
- If the task is designing or significantly changing GenLayer contract logic, let `write-contract` lead.
- If the task is executing GenLayer test workflows, let `direct-tests` and `integration-tests` lead.
- After contract edits, keep `genvm-lint` and the repo test workflow in the loop.

## Comments (C1-C5)

- C1: No metadata in comments; use Git
- C2: Delete obsolete comments immediately
- C3: No redundant comments
- C4: Write comments well if you must
- C5: Never commit commented-out code

## Functions (F1-F4)

- F1: Maximum 3 arguments when practical; use a data structure for more
- F2: No output arguments; return values instead
- F3: No flag arguments when separate functions are clearer
- F4: Delete dead functions

## General (G1-G36)

- G1: One language per file
- G2: Implement expected behavior
- G3: Handle boundary conditions
- G4: Do not override safeties casually
- G5: DRY; avoid duplication
- G6: Keep abstraction levels consistent
- G7: Base classes should not know about children
- G8: Minimize public surface area
- G9: Delete dead code
- G10: Keep variables near usage
- G11: Be consistent
- G12: Remove clutter
- G13: Avoid artificial coupling
- G14: Avoid feature envy
- G15: Avoid selector arguments
- G16: Keep intent obvious
- G17: Put code where readers expect it
- G18: Prefer instance methods when behavior belongs to the object
- G19: Use explanatory variables when they help
- G20: Function names should say what they do
- G21: Understand the algorithm before reshaping it
- G22: Make dependencies physical and visible
- G23: Prefer polymorphism to long if/else ladders
- G24: Follow conventions
- G25: Replace magic numbers with named constants
- G26: Be precise
- G27: Prefer structure over convention-only behavior
- G28: Encapsulate conditionals
- G29: Avoid negative conditionals when possible
- G30: Functions should do one thing
- G31: Make temporal coupling explicit
- G32: Do not be arbitrary
- G33: Encapsulate boundary conditions
- G34: Keep one abstraction level per function
- G35: Keep configuration at higher levels
- G36: Avoid train wrecks

## Python-Specific Rules (P1-P3)

- P1: No wildcard imports
- P2: Prefer enums or named constants to magic constants
- P3: Use type hints on public interfaces when they improve clarity

## Names (N1-N7)

- N1: Choose descriptive names
- N2: Match the abstraction level
- N3: Use standard nomenclature
- N4: Prefer unambiguous names
- N5: Match name length to scope
- N6: Avoid encodings
- N7: Names should reveal side effects

## Tests (T1-T9)

- T1: Test everything that could break
- T2: Use coverage tools
- T3: Do not skip trivial tests
- T4: An ignored test signals ambiguity
- T5: Test boundary conditions
- T6: Exhaustively test near bugs
- T7: Look for failure patterns
- T8: Look for coverage patterns
- T9: Keep tests fast

## Anti-Patterns

| Do not | Prefer |
|--------|--------|
| Comment every line | Delete obvious comments |
| Use `from x import *` | Use explicit imports |
| Keep magic number `86400` inline | Use `SECONDS_PER_DAY = 86400` |
| Pass `process(data, True)` | Split into clearer functions |
| Keep deep nesting | Use guard clauses and early returns |
| Chain through `obj.a.b.c.value` | Introduce a clearer boundary |

## AI Behavior

When reviewing code, identify issues by rule number when that adds clarity.

When editing code, favor concrete improvements over style-only churn and summarize the important fixes made.
