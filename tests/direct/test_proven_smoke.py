def _create_claim(
    contract,
    direct_vm,
    sender,
    stake,
    *,
    visibility="public",
    invite_key="",
    max_challengers=2,
):
    direct_vm.sender = sender
    direct_vm.value = stake
    return contract.create_claim(
        "Will BTC close above 100k by the deadline?",
        "Yes",
        "No",
        "https://example.com/market",
        1_700_000_000,
        stake,
        "crypto",
        0,
        "binary",
        "pool",
        0,
        "",
        "",
        max_challengers,
        visibility,
        invite_key,
    )


def test_create_claim_smoke(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/proven.py")

    claim_id = _create_claim(contract, direct_vm, direct_alice, 5)

    direct_vm.value = 0
    claim = contract.get_claim(claim_id)

    assert claim["id"] == 1
    assert claim["creator"].lower() == f"0x{direct_alice.hex()}"
    assert claim["creator_stake"] == 5
    assert claim["state"] == "open"
    assert claim["challenger_count"] == 0
    assert claim["total_pot"] == 5


def test_challenge_claim_updates_totals(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/proven.py")

    claim_id = _create_claim(contract, direct_vm, direct_alice, 5)

    direct_vm.sender = direct_bob
    direct_vm.value = 3
    contract.challenge_claim(claim_id, 3)

    direct_vm.value = 0
    claim = contract.get_claim(claim_id)

    assert claim["state"] == "active"
    assert claim["challenger_count"] == 1
    assert claim["total_challenger_stake"] == 3
    assert claim["total_pot"] == 8


def test_private_claim_requires_valid_invite_for_read_and_join(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = direct_deploy("contracts/proven.py")
    invite_key = "invite-demo-123"

    claim_id = _create_claim(
        contract,
        direct_vm,
        direct_alice,
        5,
        visibility="private",
        invite_key=invite_key,
    )

    direct_vm.value = 0
    with direct_vm.expect_revert("Private claim requires access link"):
        contract.get_claim(claim_id)

    with direct_vm.expect_revert("Private claim requires a valid invite link"):
        contract.get_claim_with_access(claim_id, "wrong-key")

    direct_vm.sender = direct_bob
    direct_vm.value = 3
    with direct_vm.expect_revert("Valid private invite link required"):
        contract.challenge_claim(claim_id, 3, "wrong-key")

    contract.challenge_claim(claim_id, 3, invite_key)
    direct_vm.value = 0

    claim = contract.get_claim_with_access(claim_id, invite_key)
    assert claim["challenger_count"] == 1
    assert claim["is_private"] is True
