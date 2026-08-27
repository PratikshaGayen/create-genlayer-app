# Issue 3 — `genlayer new` template has no `gltest.config.yaml` and no direct/integration test split

**Repo:** `genlayerlabs/genlayer-cli`
**Severity:** High
**Targets:** `templates/default/test/`, `templates/default/gltest.config.yaml` (missing)

## Problem

The official GenLayer skills (`genlayerlabs/skills` → `genlayer-dev` →
`direct-tests` and `integration-tests`) prescribe a two-folder test layout
plus a `gltest.config.yaml` at the project root. The `genlayer new`
template ships neither.

Verbatim from the
[`direct-tests/SKILL.md`](https://raw.githubusercontent.com/genlayerlabs/skills/main/plugins/genlayer-dev/skills/direct-tests/SKILL.md)
(quoted because it is the canonical layout every user is told to follow):

```python
def test_set_and_get(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/my_contract.py")
    direct_vm.sender = direct_alice
    contract.set_data("hello")
    assert contract.get_data(direct_alice) == "hello"
```

…run with `pytest tests/direct/ -v`. The skill also documents a
`tests/integration/` folder for tests that need a real Studio/testnet.

The integration-tests skill
([`integration-tests/SKILL.md`](https://raw.githubusercontent.com/genlayerlabs/skills/main/plugins/genlayer-dev/skills/integration-tests/SKILL.md))
prescribes this config file:

```yaml
# gltest.config.yaml at the project root
contract_path: contracts/

networks:
  localnet:    { }
  studionet:   { }
  testnet_bradbury:
    accounts:
      - "${ACCOUNT_PRIVATE_KEY_1}"
      - "${ACCOUNT_PRIVATE_KEY_2}"
```

What the template actually ships: a single flat `test/` folder with one
file (`test_football_bet.py`) that uses `gltest.get_contract_factory` and
calls `factory.deploy()` — i.e. the integration-style API — without a
`gltest.config.yaml` and without any direct-mode tests. `gltest --help`
itself emits the warning the user sees on first run:

```
WARNING: File `gltest.config.yaml` not found in the current directory,
using default config, create a `gltest.config.yaml` file to manage
multiple networks
```

`genlayer new` should never produce a project that triggers a warning on
its own tooling.

## Repro

```bash
genlayer new probe
cd probe
find . -path ./node_modules -prune -o -name "test*" -print
#  → ./test/  (only flat)
#  → no tests/direct, no tests/integration, no gltest.config.yaml
gltest --help
#  → emits the WARNING above
```

## Suggested fix

1. Add `gltest.config.yaml` at the project root. **Note:** the
   `integration-tests/SKILL.md` shape quoted above (`contract_path: contracts/`)
   is rejected by the shipping `genlayer-test` package — see "Related finding"
   below. Use the verified-working shape instead (confirmed against
   `genlayer-test==0.29.2`, and run in CI on every commit in
   [`create-genlayer-app`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/templates/minimal/gltest.config.yaml)):

   ```yaml
   paths:
     contracts: contracts
     artifacts: artifacts

   networks:
     default: localnet
     localnet: {}
     studionet: {}
     testnet_asimov: {}
     testnet_bradbury: {}

   environment: .env
   ```

2. Move the existing `test_football_bet.py` into `tests/integration/`
   and rename it `tests/integration/test_football_bet.py`. It uses
   `gltest.get_contract_factory` which is the integration API per the
   skill.
3. Add a `tests/direct/test_football_bet.py` that uses the
   `direct_vm`/`direct_deploy`/`direct_alice` fixtures, exercises the
   non-LLM methods (`create_bet` without the `_check_match` resolution
   call, `get_bets`, `get_points`), and runs via `pytest tests/direct/ -v`
   — the no-Docker path the skill documents.
4. Update `templates/default/README.md` so "Steps to run this example"
   step 5 splits into "Direct tests (no Studio needed)" and "Integration
   tests (Studio or testnet)".

A user following the docs (which describe `tests/direct/`) but having
`genlayer new`'s output (which gives them `test/`) is in a state that
no one can get out of without reading both the docs and the source. That
is the bug.

## Related finding: the official skill documents a config schema the shipping package rejects

While verifying the fix above, we found that `integration-tests/SKILL.md`'s
documented `gltest.config.yaml` shape (`contract_path: contracts/` at the
top level) does not work against the currently shipping `genlayer-test`.
Placing that exact config and running `pytest --collect-only` against
`genlayer-test==0.29.2` produces:

```
ERROR: Gltest configure error: Invalid configuration keys. Valid keys are:
['networks', 'paths', 'environment']
```

So a user who follows the skill's config example verbatim gets a
configuration error, not a working test run. This is separate from the
`genlayer new` defect above — it's a docs-vs-code drift between
`genlayerlabs/skills` and `genlayerlabs/genlayer-test` — and may be worth
its own issue against `genlayerlabs/skills` if this repo isn't the right
place for it.
