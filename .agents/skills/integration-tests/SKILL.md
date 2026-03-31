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
- you need pre-deployment confidence in the target environment

## Running tests

In this repo, prefer the wrappers:

```bash
npm run test:integration:localnet
npm run test:integration:studionet
npm run contract:stage
```

Raw pytest or gltest invocations are still useful for one-off debugging:

```bash
gltest tests/integration/ -v -s
gltest tests/integration/ -v -s --network localnet
gltest tests/integration/ -v -s --network studionet
gltest tests/integration/ -v -s --network testnet_bradbury
```

During development, keep `-v -s` enabled so failures and logs stay visible.

## Test pattern

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

## Key differences from direct mode

- integration tests exercise real transaction flow instead of only in-memory logic
- write calls return receipts that reflect consensus execution
- environment configuration becomes part of the debugging surface
- tests are slower, so keep them narrow and purposeful

## Write vs read calls

Use `.transact()` for write methods and assert on the returned receipt.

Use `.call()` for read methods and assert on the returned value.

## Configuration

Check `gltest.config.yaml` before assuming the environment is correct. At minimum confirm:
- contract path
- target network name
- funded accounts for the chosen network
- any environment-specific URLs or credentials required by the test

## Environments

Choose the cheapest environment that can reproduce the issue:
- GLSim for the lightest real-environment smoke coverage
- local Studio for fuller local GenVM behavior
- hosted Studio when local setup is not available
- testnet when lower-cost environments are insufficient

## Common issues

### Transaction not found

If transactions appear to vanish, clear any stale local test cache and re-run a single focused test before widening scope.

### Slow tests

Run one test file or one test function at a time during debugging. Avoid turning every direct-mode scenario into an integration case.

### JSON serialization

If test helpers return validator-like objects, convert them into plain dictionaries or primitive values before asserting or serializing them.

## Recommended workflow

1. Run `$genvm-lint` on modified contracts first.
2. Keep the integration test narrow and tied to one real behavior.
3. Start with the cheapest environment that reproduces the issue.
4. Move to testnet only when lower-cost environments are insufficient.
5. Summarize whether the failure was contract logic, environment config, or external dependency behavior.
