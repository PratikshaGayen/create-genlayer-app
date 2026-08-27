# create-genlayer-app

A scaffolder for GenLayer intelligent-contract projects, designed to be
[donated upstream](https://github.com/genlayerlabs/genlayer-cli) rather
than to compete with it.

`genlayer new <name>` (in `genlayer-cli` v0.39.1) ships a working but
stale template: the contract pins the local-only runner alias
`py-genlayer:test` and cannot be deployed to any GenLayer network; the
generated project version-drifts on `genlayer-js`; and the test layout
contradicts the official `genlayer-dev` skill. This package produces the
same kind of project without those defects, using the same contract
APIs and the same skill layout, so the two scaffolders stay in lock-step
and the upstream patches remain drop-in.

> **Where this lives.** This package's source, issues, and homepage are
> in the contributor's own GitHub namespace (`PratikshaGayen`), not the
> `genlayerlabs` org. If the team adopts this upstream, the URLs below
> move to the `genlayerlabs` org at that point — not before.

```sh
npx create-genlayer-app my-app
cd my-app
npm install
genvm-lint check contracts/storage.py
pytest tests/direct/ -v
```

## What you get

- **Storage contract** (`minimal`) or **LLM contract** (`llm`).
- **React or Vue 3** frontend wired to it via `genlayer-js`.
- **Wallet connect** (`window.ethereum`), one read call, one write call —
  exactly enough to exercise the full SDK surface without becoming an
  example app.
- **`tests/direct/`** running in milliseconds via `genlayer-test` (no
  server, no Docker). The `llm` template also exercises the
  production string-parse path of the LLM response handler.
- **`tests/integration/`** stub for Studio/testnet runs.
- **`gltest.config.yaml`** with the v0.29.x schema, so `pytest` and
  `gltest` both work out of the box.
- **`genvm-linter`** pinned in `requirements.txt`.

## Template x frontend matrix

| | `react` | `vue` |
|---|---|---|
| `minimal` (storage) | yes | yes |
| `llm` (WizardOfCoin, `run_nondet_unsafe`) | yes | yes |

All 4 combinations are exercised by `.github/workflows/ci.yml` on every
push and PR, on `ubuntu-latest` and `windows-latest`.

[![CI](https://github.com/PratikshaGayen/create-genlayer-app/actions/workflows/ci.yml/badge.svg)](https://github.com/PratikshaGayen/create-genlayer-app/actions/workflows/ci.yml)

## Quickstart

```sh
npx create-genlayer-app my-app
# (interactive) pick template + frontend, or pass them:
npx create-genlayer-app my-app --template minimal --frontend react --yes
cd my-app
npm install
pip install -r requirements.txt
genvm-lint check contracts/storage.py
pytest tests/direct/ -v
genlayer deploy --contract contracts/storage.py   # then set VITE_CONTRACT_ADDRESS
```

## Comparison vs `genlayer new` v0.39.1

This is the honest version. Every row links to the evidence in
[`docs/GAP-ANALYSIS.md`](docs/GAP-ANALYSIS.md). Defect numbers match
the gap-analysis table.

| # | Defect in `genlayer new` v0.39.1 | `genlayer new` | `create-genlayer-app` |
|---|---|---|---|
| 1 | Contract pins the local-only `test` runner alias — cannot deploy to testnet. [Evidence](docs/GAP-ANALYSIS.md#1-runner-hash-highest-priority--blocks-everything) | pins `py-genlayer:test` | pins `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (matches the official `genlayer-dev` skill) |
| 2 | `genlayer-js` version drift inside one project (`^0.9.0` at root, `0.8.0` exact in `app/`). [Evidence](docs/GAP-ANALYSIS.md#2-genlayer-js-version-drift-inside-one-project) | drift | single pinned version in both `package.json` and `app/package.json`; CI asserts no drift |
| 3 | No `gltest.config.yaml` (the `gltest` CLI warns on first run). [Evidence](docs/GAP-ANALYSIS.md#3-no-gltestconfigyaml) | missing | ships with the v0.29.x schema (`paths`, `networks`, `environment`) |
| 4 | Single flat `test/` folder; docs prescribe `tests/direct/` + `tests/integration/`. [Evidence](docs/GAP-ANALYSIS.md#4-no-directintegration-test-split) | flat `test/` | `tests/direct/` (runs via pytest, no Docker) + `tests/integration/` stub |
| 5 | 7 files of hand-rolled JSON-RPC vendored into every user project. [Evidence](docs/GAP-ANALYSIS.md#5-7-files-of-hand-rolled-json-rpc-vendored-into-user-projects) | `tools/{calldata,transactions,accounts,...}.py` | not vendored; the SDKs cover it |
| 6 | `genvm-linter` missing from `requirements.txt`. [Evidence](docs/GAP-ANALYSIS.md#6-genvm-linter-missing-from-requirementstxt) | missing | pinned at `genvm-linter==0.11.0` |
| 7 | One hardcoded Vue/football-bets template. [Evidence](docs/GAP-ANALYSIS.md#7-one-hardcoded-template) | Vue 3 only, betting app only | two templates (`minimal`, `llm`) x two frontends (`react`, `vue`); no betting app |
| 8 | Equivalent-principle example uses `strict_eq` for an LLM call (always fails consensus). [Evidence](docs/GAP-ANALYSIS.md#8-cli-template-contradicts-documented-boilerplate) | `gl.eq_principle.strict_eq(nondet)` on LLM output | `run_nondet_unsafe` with partial-field comparison — the shape the official docs prescribe |

This package is not trying to be a better `genlayer new` for end users —
the official CLI is the right place for that. It is a clean, narrow
proposal for the fixes themselves, designed so that every one of the 8
patches can be backported to `genlayer-cli/templates/default/` as a
small, reviewable PR. See [`docs/SUBMISSION.md`](docs/SUBMISSION.md)
for the adoption path.

## Verified

- **CLI**: scaffolds all 4 (template, frontend) combinations with zero
  manual edits.
- **`genvm-lint check`**: passes for both contracts (`Storage` and
  `WizardOfCoin`).
- **`pytest tests/direct/ -v`**: 5/5 pass on `minimal+react`,
  5/5 on `minimal+vue`, 10/10 on `llm+react`, 10/10 on `llm+vue` — on
  Python 3.12 via the `genlayer-test` 0.29.2 pytest plugin.
- **CI matrix**: 2 OS (ubuntu-latest, windows-latest) x 2 templates x
  2 frontends = 8 cells, all green on a clean runner. The Windows
  conftest shim is covered by `windows-latest` so a Windows-only
  regression cannot slip through.
- **Invariant checks in CI**: single `genlayer-js` version across the
  whole tree; no `py-genlayer:test`/`:latest` anywhere.

## Not verified (be honest)

- **Integration tests** (`tests/integration/`) are stubbed. They need a
  running Studio or testnet to exercise. CI does not run them.
- **`genlayer-js` API surface**: the frontend imports `createClient`,
  `readContract`, `writeContract`, `connect`, and `waitForTransactionReceipt`
  — all of which are documented in the upstream README. The build
  succeeds and the call sites type-check, but they have not been
  exercised against a live chain in this repo.
- **`genvm-lint` "newer runner available" notice**: the linter reports
  a newer runner hash than the one this template pins. The pinned
  hash is the one published by the official `genlayer-dev` skill at
  the time of writing; the linter is a stronger source of truth for
  what is *available*, the skill is the source of truth for what is
  *documented and tested against this template*.
- **No npm publish yet.** The package is ready to be published
  (`npm pack --dry-run` reports the intended tarball contents); the
  publish call is yours.

## Project layout

```
.
├── .github/workflows/ci.yml     # 8-cell matrix; scaffold, lint, test, invariants
├── src/                        # TypeScript CLI (commander + @clack/prompts + tsup)
├── templates/                   # minimal/ and llm/
├── tests/scaffold.test.ts      # vitest snapshot of all 4 combinations
├── docs/
│   ├── GAP-ANALYSIS.md         # 8 defects, each with file:line evidence
│   ├── SUBMISSION.md            # the portal submission write-up
│   └── phase1-drafts/          # 6 GitHub issue drafts (5 against genlayer-cli,
│                               #                       1 against genlayer-test)
└── package.json
```

## Credits

Template structure and CLI ergonomics follow
[`genlayerlabs/genlayer-cli`](https://github.com/genlayerlabs/genlayer-cli)'s
conventions; runner-hash sourcing follows
[`genlayerlabs/skills`](https://github.com/genlayerlabs/skills)'s
`genlayer-dev` skill. Both are upstream GenLayer projects; the
corrections here are aimed at those repos, not at replacing them.

## License

MIT, matching [`genlayer-cli`](https://github.com/genlayerlabs/genlayer-cli)'s
license so upstream adoption has no legal friction. See
[`LICENSE`](LICENSE).
