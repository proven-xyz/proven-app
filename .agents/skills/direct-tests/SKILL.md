---
name: direct-tests
description: Write, run, and refine fast direct-mode tests for GenLayer intelligent contracts using the in-memory pytest fixtures.
---

# Direct Mode Tests

Use this skill when you need fast feedback on GenLayer intelligent contracts without a server or Docker stack.

## When to use

Use this skill for:
- adding tests for contract state transitions
- checking reverts and access control
- mocking web requests or LLM responses
- reproducing contract bugs quickly
- building feature tests before slower integration tests

## What direct mode is good at

Direct mode runs fully in memory and is ideal for:
- business logic
- storage changes
- authorization checks
- parsing of mocked web / LLM responses
- edge cases and boundary conditions

Direct mode does **not** exercise full validator / consensus behavior. Use integration tests for that.

## Running tests

```bash
pytest tests/direct/ -v
pytest tests/direct/test_specific.py -v
pytest tests/direct/test_specific.py::test_one_case -v
```

## Fixtures

Available from the `genlayer-test` pytest plugin:

```python
def test_example(direct_vm, direct_deploy, direct_alice, direct_bob):
    pass
```

Useful fixtures:
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

```python
direct_vm.mock_web(
    r".*api\.example\.com/prices.*",
    {"status": 200, "body": '{"price": 42.5}'},
)
```

Full response control:

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

```python
direct_vm.mock_llm(
    r".*Extract the match result.*",
    json.dumps({"score": "2:1", "winner": 1}),
)
```

## Cheatcodes

```python
direct_vm.sender = direct_alice
direct_vm.value = 1000000000000000000

with direct_vm.expect_revert("Insufficient balance"):
    contract.withdraw(1000)

with direct_vm.prank(direct_bob):
    contract.method()

snap_id = direct_vm.snapshot()
contract.modify_state()
direct_vm.revert(snap_id)

direct_vm.deal(direct_alice, 1000000000000000000)
direct_vm.warp("2024-06-01T12:00:00Z")
```

## Test organization

```text
tests/direct/
├── conftest.py
├── test_<feature>.py
└── test_<feature>_web.py
```

## Recommended workflow

1. Run `$genvm-lint` on the contract first.
2. Add or update the smallest direct tests that prove the behavior.
3. Mock external web / LLM dependencies instead of hitting real services.
4. Prefer feature-focused tests over giant end-to-end tests.
5. If a bug only appears in validator flow, escalate to integration tests.

## Common targets

- create → read back → verify fields
- invalid inputs and expected reverts
- owner-only / role-based methods
- empty state and boundary values
- mocked parsing of web or LLM output
