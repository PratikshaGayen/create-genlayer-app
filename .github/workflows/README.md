# CI

A single matrix job scaffolds every `(template, frontend)` combination on
two operating systems and runs the full local acceptance gate inside the
scaffolded project:

| step | what it proves |
|---|---|
| `node dist/index.js probe --template … --frontend … --yes --no-install` | the CLI scaffolder works end-to-end |
| `pip install -r requirements.txt` | the generated Python deps are installable |
| `genvm-lint check contracts/<file>.py` | the generated contract passes lint + SDK validation |
| `pytest tests/direct/ -v` | the generated direct-mode tests all pass |
| `Assert single genlayer-js version` | defect #2 (version drift) cannot regress |
| `Assert no rejected runner alias` | defect #1 (`py-genlayer:test` / `:latest`) cannot regress |

The matrix is `2 OS × 2 templates × 2 frontends = 8 cells`, with a
descriptive name per cell so a failure points at the exact combination
that broke. `fail-fast: false` lets every cell report; we want all the
red, not just the first red.

OS coverage: `ubuntu-latest` is the primary path (the upstream
GenLayer SDKs ship Linux-first). `windows-latest` is included because
the `tests/direct/conftest.py` carries a Windows-only compatibility
shim (see `docs/phase1-drafts/issue-6-windows-unlink-bug.md`) and we
want any regression in that shim to be caught on every PR rather than
silently by a Windows contributor.
