---
name: integration-tests
description: Write and run GenLayer integration tests against GLSim, local Studio, hosted Studio, or testnet to validate full transaction flow and consensus behavior.
---

# Integration Tests

Use this skill when direct mode is not enough and you need to validate behavior in a real GenLayer environment.

## When to use

Use this skill for:
- end-to-end contract smoke tests before deployment
- validating write transactions through consensus flow
- testing real web requests and LLM calls
- reproducing bugs that do not appear in direct mode
- checking runtime compatibility in actual GenLayer environments

## Prefer direct tests first

Direct mode is still the first stop for most logic. Move to integration tests when:
- consensus behavior matters
- the contract depends on real external calls
- the bug only appears outside the in-memory runner
- you need pre-deployment confidence

## Running tests

```bash
gltest tests/integration/ -v -s
gltest tests/integration/ -v -s --network localnet
gltest tests/integration/ -v -s --network studionet
gltest tests/integration/ -v -s --network testnet_bradbury
```

During development, keep `-v -s` so failures and logs stay visible.

## Core pattern

```python
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

def test_full_flow():
    factory = get_contract_factory("MyContract")
    contract = factory.deploy(args=[])

    tx_receipt = contract.set_data(args=["hello"]).transact()
    assert tx_execution_succeeded(tx_receipt)

    result = contract.get_data(args=[contract.address]).call()
    assert result == "hello"
```

## Mental model

### Write methods

Use `.transact()` and assert on the returned transaction receipt.

### Read methods

Use `.call()` and assert on the returned value.

## Environment guidance

From the original skill:
- **GLSim** is the lightest real-environment option and good for quick iteration.
- **Local Studio** gives full GenVM behavior.
- **Hosted Studio** avoids local setup but may be rate-limited.
- **Testnet Bradbury** is the real network and requires funded accounts.

## Configuration

See the `gltest.config.yaml` pattern in `references/original-claude-skill.md`. At minimum, confirm:
- contract path
- target network name
- available test accounts for the chosen network

## Common recovery steps

- If transactions are mysteriously missing, clear `.gltest_cache`.
- During development, run a single test node or one test function at a time.
- For validator-like objects in test context, convert them to dicts if serialization becomes an issue.

## Recommended workflow

1. Run `$genvm-lint` on modified contracts first.
2. Keep the integration test narrow and purposeful.
3. Start with the cheapest environment that reproduces the issue.
4. Move to testnet only when lower-cost environments are insufficient.
5. Summarize whether the failure was contract logic, environment config, or external dependency behavior.
