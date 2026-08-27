# { "Depends": "py-genlayer:__RUNNER_HASH_PY__" }

"""
Storage contract for the __PROJECT_NAME__ project.

Pinned runner: py-genlayer:__RUNNER_HASH_PY__
- This hash is published in the official `genlayer-dev` skill at
  https://github.com/genlayerlabs/skills/blob/main/plugins/genlayer-dev/skills/write-contract/SKILL.md
  and matches the `genvm-runners-all.tar.xz` artifact on the
  `genlayerlabs/genvm` v0.3.0-rc7 release.
- Never replace with `test` or `latest`; both are local-only aliases that
  every GenLayer network rejects.

This contract is intentionally LLM-free so it can be unit-tested in
direct mode without a Docker daemon. It exercises three pieces of the
storage surface that every contract will need:

  * A per-address counter (TreeMap[Address, u256]).
  * A read method (@gl.public.view) and a write method (@gl.public.write).
  * A typed user error on bad input, so validators can compare the
    exact message via the canonical [EXPECTED] prefix.
"""

from genlayer import *


class Storage(gl.Contract):
    # Storage fields are class-level type annotations, NOT __init__ assignments.
    # The annotation declares the storage slot; __init__ only sets initial values.
    balances: TreeMap[Address, u256]
    total_updates: u256

    def __init__(self):
        # DynArray / TreeMap start empty.
        # u256 needs an explicit initial value to satisfy the SDK's storage
        # typing on the deployment slot.
        self.total_updates = 0

    @gl.public.write
    def increment(self, by: int) -> None:
        if by <= 0:
            raise gl.vm.UserError("[EXPECTED] increment amount must be positive")
        sender = gl.message.sender_address
        current = self.balances.get(sender, 0)
        self.balances[sender] = current + by
        self.total_updates += 1

    @gl.public.view
    def get_balance(self, holder: str) -> int:
        return int(self.balances.get(Address(holder), 0))

    @gl.public.view
    def get_total_updates(self) -> int:
        return int(self.total_updates)
