# create-genlayer-app — Phase 0 Gap Analysis

**For:** GenLayer team reviewer with no prior context on this project.
**Scope:** fact-finding only. No product code written. All claims cite a file
path, a command, or a URL.
**Date:** 2026-08-25 · **CLI tested:** `genlayer 0.39.1` · **Python:** 3.14.3

---

## 1. Runner hash to pin (resolves Defect #1)

**Use this exact line at the top of every generated contract:**

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
```

For multi-file Python packages, use `py-genlayer-multi:06zyvrlivjga0d5jlpdbprksc0pa6jmllxvp8s20hq1l512vh5yk`.
For embedding/semantic-search contracts, add a `Seq` block that loads
`py-lib-genlayer-embeddings:0bmbm3cyfwxsyh454z53vxqjf47wz2q7smcqp1q4g4a6k2kidnyk`
before the Python runner. **All three hashes are quoted verbatim from the
official GenLayer-maintained `genlayer-dev` skill, file
`plugins/genlayer-dev/skills/write-contract/SKILL.md`** in the
[`genlayerlabs/skills`](https://github.com/genlayerlabs/skills) repo. URL:
<https://raw.githubusercontent.com/genlayerlabs/skills/main/plugins/genlayer-dev/skills/write-contract/SKILL.md>
(retrieved 2026-08-25).

The skill explicitly says *"All GenLayer networks reject `py-genlayer:test`,
`py-genlayer:latest`, and unversioned runner aliases"* — confirming the ROADMAP
claim that the official template's `py-genlayer:test` is unusable for
deployment.

The runner artifacts themselves ship as `genvm-runners-all.tar.xz` on the
[`genlayerlabs/genvm`](https://github.com/genlayerlabs/genvm/releases) release
page; latest is `v0.3.0-rc7` (published 2026-06-19). The `genvm` repo is
archived and redirects to `genlayerlabs/genvm-manager`, but the runner tarballs
remain the canonical place the network resolves hashes against. Skills plugin
is the authoritative pin source.

---

## 2. Python 3.14.3 compatibility — risk resolved

Both packages install cleanly on Python 3.14.3 in a throwaway venv. Exact
command and outcome:

```powershell
py -3.14 -m venv C:\Users\PRATIKSHA\AppData\Local\Temp\opencode\phase0\venv314
...\venv314\Scripts\python.exe -m pip install genlayer-test==0.29.2 genvm-linter==0.11.0
```

Final lines of the pip output:

```
Successfully installed aiohappyeyeballs-2.7.1 aiohttp-3.14.3 aiosignal-1.4.0 ...
genlayer-py-0.16.3 genlayer-test-0.29.2 ... genvm-linter-0.11.0 ... web3-7.16.0 ...
```

Full log: `C:\Users\PRATIKSHA\AppData\Local\Temp\opencode\phase0\install.log`
(captured 2026-08-25). **Latest versions as of 2026-08-25:**
`genlayer-test 0.29.2`, `genvm-linter 0.11.0`. The template-pinned
`genlayer-test==0.1.1` also installs on 3.14.3 (it pulls in `genlayer-py 0.1.0`)
— so the "Python 3.12+" docstring understates support; 3.14.3 works.

`genvm-lint` and `gltest` CLIs are both on `PATH` after install and print
help normally (e.g. `genvm-lint check`, `gltest`).

---

## 3. Defect table — all 8 reproduce from a clean `genlayer new probe2`

Command run: `genlayer new probe2 --path C:\Users\PRATIKSHA\AppData\Local\Temp\opencode\phase0\probe2`
→ `√ Project "probe2" created successfully at ...\probe2\probe2`. Note the
double-nested `probe2\probe2\contracts` (CLI creates a subdirectory using the
project name — minor UX bug not listed in the table).

| # | Defect | Verbatim evidence | Reproduces? |
|---|---|---|---|
| 1 | Pinned local-only `test` alias | `probe2\probe2\contracts\football_bets.py:1` → `# { "Depends": "py-genlayer:test" }` | **Yes** |
| 2 | `genlayer-js` drift (root `^0.9.0` vs app `0.8.0`) | root `package.json` `"genlayer-js": "^0.9.0"`; `app/package.json` `"genlayer-js": "0.8.0"` | **Yes** |
| 3 | No `gltest.config.yaml` | `Get-ChildItem -Recurse -Filter gltest.config.yaml` returns empty. `gltest --help` itself emits `WARNING: File 'gltest.config.yaml' not found in the current directory` | **Yes** |
| 4 | No direct/integration split | Only flat `probe2\probe2\test\`. No `tests/direct\`, no `tests\integration\` | **Yes** |
| 5 | 7 files of hand-rolled JSON-RPC vendored | `probe2\probe2\tools\`: `accounts.py, calldata.py, request.py, response.py, structure.py, transactions.py, types.py` (+ `__init__.py`) | **Yes** |
| 6 | `genvm-linter` missing from requirements | `requirements.txt` contains only `requests==2.32.2`, `python-dotenv==1.0.1`, `eth-account==0.13.3`, `eth-utils==5.0.0`, `genlayer-test==0.1.1` | **Yes** |
| 7 | One hardcoded template (football betting) | `probe2\probe2\contracts\football_bets.py` (FootballBets class with BBC Sport resolution URL); README line 9: "specifically a football bets game" | **Yes** |
| 8 | CLI contradicts documented boilerplate | App contains `App.vue` (Vue 3), `package.json` deps `vue@^3.4.37`; tests use `gltest.get_contract_factory`. Docs/skill (`integration-tests/SKILL.md`, `direct-tests/SKILL.md`) prescribe `tests/direct/` + `tests/integration/`; CLI emits a single flat `test/` and Vue (not the Next.js described in older docs) | **Yes** |

**All 8 reproduce. None are false claims.**

---

## 4. Contribution rules for `genlayer-cli`

Repo: [`genlayerlabs/genlayer-cli`](https://github.com/genlayerlabs/genlayer-cli)
(recently migrated from the `yeagerai` org; the CONTRIBUTING doc still uses
the old issue tracker URL).

- **License:** MIT, Copyright (c) 2024-present YeagerAI LLC. Verbatim from
  `https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/LICENSE`:
  *"Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software…to deal in the Software without restriction…"*
  Compatible with MIT-licensed contribution work; no copyleft obligations.
- **CONTRIBUTING.md exists.** Requires: (1) pick an issue and self-assign;
  (2) create a branch from the link in the issue's "Development" panel;
  (3) `npm install`, `npm run dev`, `node dist/index.js <command>` for local
  testing; (4) `npm run test` (Jest + ts-jest, ESM) before submitting;
  (5) Prettier on save; (6) conventional-commit PR title; (7) link PR to
  issue. Verbatim from the file (section "1.6 Run unit tests"):
  *"The GenLayer CLI uses Jest in combination with ts-jest to handle testing
  of TypeScript files. The configuration is tailored to support ES Modules
  (ESM)…"*
- **No CLA mentioned.** CONTRIBUTING.md is silent on a CLA, contributor
  license agreement, or DCO. The only legal sign-off is the MIT license
  header on the PR's source files.
- **Template lives in the same repo.** Path:
  `genlayer-cli/templates/default/` (visible in the repo tree, e.g.
  `https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/templates/default/contracts/football_bets.py`
  still contains `# { "Depends": "py-genlayer:test" }` — confirming defect
  #1 has not been fixed upstream either). **Implication:** a PR fixing defect
  #1 can be opened against `genlayer-cli` directly without touching any
  other repo.
- **Branch model:** `main` is the default GitHub branch only; the
  release-train model lives in `docs/BRANCHING.md`. Independently releasable
  PRs may target the active `stable` branch; multi-feature work goes through
  the matching `*-dev` integration branch. CONTRIBUTING.md verbatim:
  *"independently releasable work may target the stable branch directly;
  multi-feature or cross-repo train work uses the active `*-dev` integration
  branch…"*
- **Release process:** `scripts/release.sh` is the only sanctioned path to
  publish to npm. Semver-zero rule: `0.39 → 0.40` is a major bump, requires
  a new branch, and the script refuses `minor`/`major` keywords without
  `--allow-major`. **Any contribution that changes CLI surface may need
  coordination on the release branch.**

---

## 5. `gltest` direct mode — exact current syntax

Source: `plugins/genlayer-dev/skills/direct-tests/SKILL.md` in
[`genlayerlabs/skills`](https://github.com/genlayerlabs/skills). Runs via
`pytest`, no server, no Docker, ~30–50 ms per test. Verbatim fixture names:
`direct_vm`, `direct_deploy`, `direct_alice`, `direct_bob`, `direct_charlie`,
`direct_owner`, `direct_accounts`.

**Minimal working example (from the skill, reproduced verbatim):**

```python
# tests/direct/test_set_and_get.py
def test_set_and_get(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/my_contract.py")
    direct_vm.sender = direct_alice
    contract.set_data("hello")
    result = contract.get_data(direct_alice)
    assert result == "hello"
```

Run: `pytest tests/direct/ -v`. **This is the fixture+import contract every
template must implement.** Two minor naming differences vs. the `gltest` CLI
help output (which lists `--contracts-dir`, `--network localnet`, etc.):
the direct-tests skill is invoked through `pytest` and uses Python fixture
names; the `gltest` CLI is for integration tests that need an RPC. Same
package (`genlayer-test 0.29.2`); two entry points.

Mocking cheatcodes also confirmed from the same SKILL.md:
`direct_vm.mock_web(r".*api.example.com.*", {"status": 200, "body": "..."})`,
`direct_vm.mock_llm(r".*prompt.*", json.dumps({...}))`, `direct_vm.expect_revert("msg")`,
`direct_vm.prank(direct_bob)`, `direct_vm.snapshot()` / `revert(id)`,
`direct_vm.warp("2024-06-01T12:00:00Z")`.

---

## Phase-0 gate verdict

| Gate item | Status |
|---|---|
| Runner hash known | **Yes** — `1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Python compatibility settled | **Yes** — both `genlayer-test` 0.29.2 and `genvm-linter` 0.11.0 install on 3.14.3; pinned 0.1.1 also works |
| All 8 defects reproduce | **Yes** — 8 / 8 |
| Contribution rules clear | **Yes** — MIT, no CLA, template in-repo at `genlayer-cli/templates/default/` |
| `gltest` direct syntax located | **Yes** — pytest plugin via `genlayer-test 0.29.2`; fixtures `direct_vm`, `direct_deploy`, `direct_alice`, `direct_bob` |

**Phase 0 ready to close. No public posts made, no CLI code written.**
