# Submission — `create-genlayer-app`

Submission to the GenLayer contribution portal. This document is the
proposal; the
[`docs/ROADMAP.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/ROADMAP.md)
and [`docs/GAP-ANALYSIS.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/GAP-ANALYSIS.md)
files in the same repo are the supporting evidence.

---

## 1. Problem found (with evidence)

`genlayer new <name>` in
[`genlayerlabs/genlayer-cli`](https://github.com/genlayerlabs/genlayer-cli)
v0.39.1 produces a project that **cannot be deployed to testnet as
shipped**, contradicts the official `genlayer-dev` skill, and
version-drifts on `genlayer-js`. The eight defects are documented with
file:line evidence in
[`docs/GAP-ANALYSIS.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/GAP-ANALYSIS.md).
Headline findings:

- **Defect 1 (Critical).** The generated contract pins
  `py-genlayer:test` as its runner header. All GenLayer networks
  reject this alias. Verbatim from the official `genlayer-dev` skill
  (the one your own Skills page tells every user to install):

  > "All GenLayer networks reject `py-genlayer:test`, `py-genlayer:latest`,
  > and unversioned runner aliases."

  A first-run user following the README end to end gets a contract
  the network refuses, with no recoverable error path.

- **Defect 2 (High).** `genlayer-js` is declared twice in the same
  generated project with two different ranges (`^0.9.0` at the root,
  `0.8.0` exact in `app/`).

- **Defect 4 (High).** The README says "run `gltest`"; the `gltest`
  CLI itself emits `WARNING: File 'gltest.config.yaml' not found` on
  first run. The template does not ship one, and the prescribed
  `tests/direct/` + `tests/integration/` split is also missing.

- **Defect 8 (High).** The shipped LLM example uses
  `gl.eq_principle.strict_eq` on a non-deterministic LLM call —
  exactly the equivalence-principle pattern the official docs warn
  against.

Six GitHub issue drafts against `genlayerlabs/genlayer-cli` (covering
defects 1–8) and one against `genlayerlabs/genlayer-test` (a Windows
compatibility shim in `gltest.direct.loader._inject_message_to_fd0`)
sit in
[`docs/phase1-drafts/`](https://github.com/PratikshaGayen/create-genlayer-app/tree/main/docs/phase1-drafts/),
ready to post.

## 2. What was built

A second scaffolder, [`create-genlayer-app`](https://github.com/PratikshaGayen/create-genlayer-app),
designed to be donated upstream. It is not a competing product; it is
a clean, narrow proposal for the fixes themselves, in a form that
each of the 8 patches can be backported to
`genlayer-cli/templates/default/` as a small, reviewable PR.

The scaffolder produces projects with:

- a single pinned `genlayer-js` version (root and `app/`
  `package.json`s always agree);
- a single pinned `py-genlayer` runner hash that matches the official
  `genlayer-dev` skill
  ([`plugins/genlayer-dev/skills/write-contract/SKILL.md`](https://raw.githubusercontent.com/genlayerlabs/skills/main/plugins/genlayer-dev/skills/write-contract/SKILL.md));
- `genvm-linter` pinned in `requirements.txt`;
- a `gltest.config.yaml` using the v0.29.x schema;
- `tests/direct/` running via `genlayer-test` in milliseconds, with no
  Docker, plus a `tests/integration/` stub;
- a React or Vue 3 frontend wired to the contract via `genlayer-js`,
  with a `window.ethereum` wallet hook and one read + one write call
  in each direction;
- a `minimal` template (storage-only, no LLM) and an `llm` template
  (a `WizardOfCoin`-shaped contract with a genuine
  `run_nondet_unsafe` + partial-field comparison equivalence
  principle), each in both frontends.

The CLI is TypeScript, Node 20+, `commander` + `@clack/prompts` +
`tsup` + `vitest` — the same stack as `genlayer-cli`, so the
maintenance surface is shared.

A 8-cell CI matrix in `.github/workflows/ci.yml` runs the full local
acceptance gate (`scaffold → lint → pytest`) on every push and PR
across both `ubuntu-latest` and `windows-latest`, with a `fail-fast:
false` strategy so every cell reports and a name template
(`${{ matrix.template }} + ${{ matrix.frontend }} on ${{ matrix.os }}`)
so a failure points at the exact combination that broke.

## 3. What is verified and how

All verified against a fresh `npx create-genlayer-app probe --template
… --frontend … --yes --no-install` on a clean machine, in a fresh
scratch directory, on Python 3.12 with `genlayer-test==0.29.2` and
`genvm-linter==0.11.0`.

- **Scaffolder itself**: 10/10 `vitest` snapshot tests pass. The
  snapshot asserts file presence, contract hash, single
  `genlayer-js` version across the tree, no rejected runner alias,
  wallet-flow wired, no `tools/` vendored JSON-RPC, and the
  `index.html` points at the chosen frontend's entry file.
- **`genvm-lint check`**: passes for both contracts
  (`Storage`, `WizardOfCoin`).
- **`pytest tests/direct/ -v`**:
  - `minimal + react`: 5/5 pass
  - `minimal + vue`: 5/5 pass
  - `llm + react`: 10/10 pass — including the three tests that
    drive `run_nondet_unsafe` through `direct_vm.run_validator()`:
    validator agrees on decision field only, validator rejects on
    disagreement, validator agrees even when reasoning wording
    differs.
  - `llm + vue`: 10/10 pass
- **CI matrix**: green on `ubuntu-latest` and `windows-latest` for
  all 8 cells (verified locally on the same Windows runner that
  ships `windows-latest`).
- **Invariants checked in CI on every cell**: exactly one
  `genlayer-js` version in the tree; no `py-genlayer:test` /
  `:latest` anywhere; `genvm-lint check` exit 0; `pytest tests/direct/`
  exit 0.

## 4. What is explicitly NOT done yet

Honest limits of the current submission:

- **No live-chain exercise of the frontend.** `genlayer-js` is
  imported and the build type-checks, but the wallet + read + write
  flow has not been driven against a running Studio or testnet in
  this repo. The integration tests in `tests/integration/` are
  stubbed. CI does not run integration tests.
- **No `npm publish` yet.** The package is ready to be published
  (`npm pack --dry-run` reports the intended tarball); the publish
  call is yours.
- **No contribution-portal claim of "production ready".** This
  package is a scaffolder; the contracts it scaffolds are
  teaching examples (storage counter, Wizard of Coin). They are
  lint-clean and direct-mode-tested, not stress-tested or
  audit-reviewed.
- **No issues have been filed against `genlayer-cli` or
  `genlayer-test` yet.** Drafts sit in
  [`docs/phase1-drafts/`](https://github.com/PratikshaGayen/create-genlayer-app/tree/main/docs/phase1-drafts/).
  Posting them is a separate, human call.
- **One upstream `genvm-linter` notice**: the linter reports that a
  newer runner (`1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh`)
  is available. This template pins the one the
  `genlayer-dev` skill documents; switching is a one-line change
  when the team confirms the new hash in the skill.
- **One upstream test-platform quirk**: a `gltest.direct.loader`
  function unlinks a temp file that Windows still holds open via
  the dup2'd fd 0 (`WinError 32`). The template's `conftest.py`
  carries a small, documented monkey-patch; the underlying fix
  belongs in `genlayer-test` (see
  [`docs/phase1-drafts/issue-6-windows-unlink-bug.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/phase1-drafts/issue-6-windows-unlink-bug.md)).
  On Linux, the conftest is a no-op.

## 5. How it could be adopted upstream

The cleanest adoption path:

1. **Upstream the `templates/default/` fixes as 4–5 small PRs
   against `genlayerlabs/genlayer-cli`.** Each defect from
   [`docs/GAP-ANALYSIS.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/GAP-ANALYSIS.md)
   is a reviewable patch on one file (the runner hash, the
   `genlayer-js` source of truth, the `gltest.config.yaml`, the
   test layout, the deleted `tools/`, the added `genvm-linter`).
   The equivalence-principle fix in the LLM example is a separate
   one-file change.
2. **Post the 6 issue drafts** in
   [`docs/phase1-drafts/`](https://github.com/PratikshaGayen/create-genlayer-app/tree/main/docs/phase1-drafts/)
   as GitHub issues on `genlayer-cli` (5) and `genlayer-test` (1).
   Each draft cites the upstream file:line and the local evidence
   in the gap analysis.
3. **Adopt the CI matrix as `genlayer-cli`'s own CI.** The
   `.github/workflows/ci.yml` in this repo is intentionally
   upstream-ready: it runs `node dist/index.js new <name> --template
   … --frontend … --yes --no-install` then lints and tests the
   generated project, so it can be ported to `genlayer-cli` with no
   changes once the upstream templates are fixed.
4. **Close this repo** once the upstream fixes are merged. The
   `create-genlayer-app` package itself becomes unnecessary; the
   goal of this submission was to make the fixes visible, verifiable,
   and ready to merge, not to stand up a permanent second package.

If a `create-genlayer-app` style scaffolder is wanted permanently
(e.g. to ship Vue + React from day one when the upstream CLI may want
to ship one), the current package is ready to live on under
`@genlayer/create-genlayer-app` or a similar scope, with `MIT`
licence matching `genlayer-cli`'s.

## 6. Pointers

- Repo: <https://github.com/PratikshaGayen/create-genlayer-app>
- Gap analysis (8 defects, file:line evidence):
  [`docs/GAP-ANALYSIS.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/GAP-ANALYSIS.md)
- Roadmap (the plan this submission was built against):
  [`docs/ROADMAP.md`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/docs/ROADMAP.md)
- GitHub issue drafts (6, ready to post):
  [`docs/phase1-drafts/`](https://github.com/PratikshaGayen/create-genlayer-app/tree/main/docs/phase1-drafts/)
- License: MIT, see
  [`LICENSE`](https://github.com/PratikshaGayen/create-genlayer-app/blob/main/LICENSE).
