"""
Pytest config for the direct-mode tests.

The direct-mode fixtures (`direct_vm`, `direct_deploy`, `direct_alice`, …)
are provided by the `genlayer-test` pytest plugin. This file only exists
so pytest finds the test root without picking up `tests/integration/`
(which uses `gltest`, not `pytest`).
"""
