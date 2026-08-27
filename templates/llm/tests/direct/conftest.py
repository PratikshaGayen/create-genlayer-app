"""Shared pytest fixtures for direct-mode tests.

These fixtures come from the `gltest.direct.pytest_plugin` plugin
shipped with `genlayer-test`. The names match the canonical list in the
official `genlayer-dev:direct-tests` skill (genlayerlabs/skills):

  direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie,
  direct_owner, direct_accounts

The plugin is auto-loaded through its entry-point in modern pytest
versions, but we declare it here explicitly so the test suite works on
any runner (and so missing-install errors are loud, not silent).
"""

from __future__ import annotations

import sys

import pytest

try:
    from gltest.direct.pytest_plugin import (  # noqa: F401
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
    )
    _GltestDirectMissing: Exception | None = None
except Exception as e:  # pragma: no cover - import error path
    _GltestDirectMissing = e


def pytest_collection_modifyitems(config, items):
    """Skip direct-mode tests if `genlayer-test` is not installed."""
    if _GltestDirectMissing is not None:
        skip = pytest.mark.skip(
            reason=f"genlayer-test direct plugin not available: {_GltestDirectMissing}"
        )
        for item in items:
            item.add_marker(skip)


# Windows compatibility: upstream
# `gltest.direct.loader._inject_message_to_fd0` calls
# `os.unlink(path)` *after* `os.dup2(fd, 0)` has succeeded. POSIX
# happily unlinks a file with an open fd; Windows refuses with
# `WinError 32: The process cannot access the file because it is being
# used by another process`. The temp file is in `%TEMP%` either way —
# the OS sweeps it on its own schedule — so the only thing this unlink
# buys is a cleaner temp directory in the happy path.
#
# The minimal fix is to wrap the upstream function and swallow the
# `OSError`. We deliberately do NOT re-implement the message-dict
# construction, calldata encoding, or fd/dup2 dance here — that
# internal logic is the upstream maintainer's job to evolve, and
# duplicating it would re-introduce exactly the kind of vendored-
# plumbing defect this whole project exists to remove.
if sys.platform == "win32":
    import gltest.direct.loader as _loader

    _orig_inject = _loader._inject_message_to_fd0

    def _patched_inject(vm):
        try:
            _orig_inject(vm)
        except OSError:
            # Windows holds the temp file open via the dup2'd fd 0.
            pass

    _loader._inject_message_to_fd0 = _patched_inject


# Pin the GenVM SDK version direct-mode tests download, instead of
# trusting upstream `gltest.direct.sdk_loader.get_latest_version()`.
# That function resolves GitHub's `/releases/latest` redirect and
# assumes the tagged release ships a `genvm-universal.tar.xz` asset.
# As of 2026-08, `/latest` resolves to a release that does NOT ship
# that asset, so any machine with no local `gltest-direct` cache (any
# CI runner, or any contributor's first run) gets an HTTP 404 on every
# direct-mode test. `v0.2.16` is verified to both download successfully
# and contain the runner hash this template's contracts pin. Pinning an
# explicit, verified version instead of "latest" is the same principle
# behind this whole project's runner-hash fix (see GAP-ANALYSIS.md
# defect #1) - never trust an upstream "latest" alias to still be what
# it was when it last worked.
import gltest.direct.sdk_loader as _sdk_loader  # noqa: E402

_sdk_loader.get_latest_version = lambda: "v0.2.16"


@pytest.fixture
def wizard_contract_path() -> str:
    return "contracts/wizard_of_coin.py"
