"""Direct-mode tests for the `Storage` contract.

These run in-memory via the `genlayer-test` pytest plugin — no server,
no Docker, ~30 ms per test. They exercise the *leader* code path only;
validator consensus is covered by `tests/integration/`.

Fixture names come from the official `genlayer-dev:direct-tests` skill.
If `genlayer-test` is not installed, these tests are skipped (see
`conftest.py`).
"""


def test_increment_writes_to_sender_balance(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/storage.py")
    direct_vm.sender = direct_alice

    contract.increment(3)
    contract.increment(4)

    assert contract.get_balance(direct_alice) == 7


def test_balances_are_isolated_per_sender(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/storage.py")

    direct_vm.sender = direct_alice
    contract.increment(2)

    direct_vm.sender = direct_bob
    contract.increment(10)

    assert contract.get_balance(direct_alice) == 2
    assert contract.get_balance(direct_bob) == 10


def test_total_updates_tracks_writes(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/storage.py")
    direct_vm.sender = direct_alice

    assert contract.get_total_updates() == 0
    contract.increment(1)
    contract.increment(1)
    assert contract.get_total_updates() == 2


def test_increment_rejects_zero_and_negative(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/storage.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("increment amount must be positive"):
        contract.increment(0)
    with direct_vm.expect_revert("increment amount must be positive"):
        contract.increment(-5)


def test_get_balance_for_unknown_address_is_zero(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/storage.py")
    direct_vm.sender = direct_alice
    contract.increment(1)

    # direct_bob never wrote anything — should read as zero.
    assert contract.get_balance(direct_bob) == 0
