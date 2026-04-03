---
name: direct-tests
description: Write, run, and refine fast direct-mode tests for GenLayer intelligent contracts using the in-memory pytest fixtures.
---

# Direct Mode Tests

Use this skill when you need fast feedback on GenLayer intelligent contracts without a server or Docker stack.

## When to use

Use this skill for:
- adding tests for state transitions and storage updates
- checking expected reverts and access control
- mocking web requests or LLM calls
- reproducing contract bugs quickly
- building feature tests before slower integration tests

Direct mode is ideal for business logic, storage changes, authorization checks, parsing of mocked web or LLM responses, and edge cases. It does not exercise full validator or consensus behavior. Use `$integration-tests` for that.

## Running tests

In this repo, prefer:

```bash
npm run test:direct
```

Raw pytest commands are still useful when you need to target one file or one case:

```bash
pytest tests/direct/ -v
pytest tests/direct/test_specific.py -v
pytest tests/direct/test_specific.py::test_one_case -v
```

## Fixtures

Available from the `genlayer-test` pytest plugin:

```python
def test_example(direct_vm, direct_deploy, direct_alice, direct_bob):
    # direct_vm: VMContext with cheatcodes
    # direct_deploy: deploy a contract file
    # direct_alice / direct_bob: test addresses
    pass
```

Common fixtures:
- `direct_vm`
- `direct_deploy`
- `direct_alice`
- `direct_bob`
- `direct_charlie`
- `direct_owner`
- `direct_accounts`

## Basic test pattern

```python
def test_set_and_get(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/my_contract.py")
    direct_vm.sender = direct_alice

    contract.set_data("hello")

    result = contract.get_data(direct_alice)
    assert result == "hello"
```

## Mocking web requests

For contracts that call `gl.nondet.web.get()`:

```python
import json

def test_with_web_mock(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/my_contract.py")
    direct_vm.sender = direct_alice

    direct_vm.mock_web(
        r".*api\.example\.com/prices.*",
        {"status": 200, "body": '{"price": 42.5}'},
    )

    contract.update_price("ETH/USD")
    assert contract.get_price("ETH/USD") == 42.5
```

### Full mock format

Use the full response form when you need headers or method control:

```python
direct_vm.mock_web(
    r"api\.example\.com/data",
    {
        "response": {
            "status": 200,
            "headers": {},
            "body": json.dumps({"key": "value"}).encode(),
        },
        "method": "GET",
    },
)
```

## Mocking LLM responses

For contracts that call `gl.nondet.exec_prompt()`:

```python
import json

direct_vm.mock_llm(
    r".*Extract the match result.*",
    json.dumps({"score": "2:1", "winner": 1}),
)
```

## Clearing mocks

```python
direct_vm.clear_mocks()
```

Use this between scenarios when a single test needs different mocked responses.

## VMContext cheatcodes

```python
# Set transaction sender
direct_vm.sender = direct_alice

# Set native value (wei)
direct_vm.value = 1000000000000000000

# Expect a revert
with direct_vm.expect_revert("Insufficient balance"):
    contract.withdraw(1000)

# Temporary sender change
with direct_vm.prank(direct_bob):
    contract.method()

# Snapshot and restore state
snap_id = direct_vm.snapshot()
contract.modify_state()
direct_vm.revert(snap_id)

# Set account balance
direct_vm.deal(direct_alice, 1000000000000000000)

# Time travel
direct_vm.warp("2024-06-01T12:00:00Z")
```

## What to test in direct mode

Focus direct tests on:
- state transitions such as create -> update -> read back
- validation and expected reverts
- owner-only and role-based methods
- empty-state and boundary cases
- parsing and normalization of mocked web or LLM output

## Common patterns

### Testing access control

```python
def test_only_owner(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/my_contract.py")

    direct_vm.sender = direct_alice
    contract.create_item("item_1")

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only owner"):
        contract.delete_item("item_1")
```

### Testing state transitions

```python
def test_state_flow(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/my_contract.py")
    direct_vm.sender = direct_alice

    contract.create_item("item_1")
    assert contract.get_item("item_1")["status"] == "pending"

    contract.approve_item("item_1")
    assert contract.get_item("item_1")["status"] == "approved"
```

### Reusable mock helpers

Put reusable helpers in `tests/direct/conftest.py`:

```python
import json

def mock_price_api(direct_vm, pair: str, price: float):
    direct_vm.mock_web(
        rf".*api\.example\.com/prices/{pair}.*",
        {"status": 200, "body": json.dumps({"price": price})},
    )
```

## Recommended workflow

1. Run `$genvm-lint` on the contract first.
2. Add or update the smallest direct tests that prove the behavior.
3. Mock external dependencies instead of hitting real services.
4. Prefer feature-focused tests over giant end-to-end tests.
5. Escalate to `$integration-tests` only when validator flow or real environments matter.

## Tips

- Always set `direct_vm.sender` before calling write methods.
- Use `genvm-lint check ... --json` when you need to confirm method names or constructor shape before writing tests.
- Keep mocked responses minimal and deterministic.
- If a failure only appears outside the in-memory runner, stop growing direct tests and move to integration coverage.
