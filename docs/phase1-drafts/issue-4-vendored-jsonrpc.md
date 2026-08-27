# Issue 4 — `genlayer new` vendors 7 hand-rolled JSON-RPC files into every user's project

**Repo:** `genlayerlabs/genlayer-cli`
**Severity:** Medium
**Targets:** `templates/default/tools/{calldata,transactions,accounts,request,response,structure,types}.py`

## Problem

The template copies seven Python files of hand-rolled JSON-RPC plumbing
into every project, none of which are needed: `genlayer-js` and
`genlayer-test` (the official SDKs, already in the project's
`package.json` and `requirements.txt`) provide the same surface. A first-
run user reads the README, opens the `tools/` folder, and finds ~600 lines
of `request.py`/`response.py`/`transactions.py` that they did not ask
for, that no docs page references, and that have no public function the
generated `test_football_bet.py` calls.

The list (verbatim, from the generated tree):

```
tools/accounts.py
tools/calldata.py
tools/request.py
tools/response.py
tools/structure.py
tools/transactions.py
tools/types.py
```

What calls into them, in the generated project? Nothing. `grep -r
"from tools" templates/default/` (or the equivalent on the generated
tree) returns no matches; the integration test uses
`gltest.get_contract_factory`, not the vendored helpers.

## Repro

```bash
genlayer new probe
cd probe
wc -l tools/*.py | tail -1
# → ~600 lines of JSON-RPC plumbing, none of it imported by anything
```

## Suggested fix

1. Delete the entire `tools/` directory from `templates/default/`. The
   seven files can move to `genlayer-cli/src/lib/jsonrpc/` if a CLI
   command needs them, but they should not be in the user-facing
   template.
2. If a particular helper (e.g. ABI calldata construction) is genuinely
   needed by a CLI command such as `genlayer deploy --args`, it should
   live in `genlayer-cli/src/` and be invoked from the CLI source, not
   vendored into every user project.
3. If any of the seven files is referenced from a future user-facing
   README or example, that is a separate problem — the file should be
   re-derived from `genlayer-js` or `genlayer-test` rather than copied.

## Why grouped separately from Issues 1–3

Issues 1–3 are about dependencies and structure that the user actively
needs to write or test a contract. The `tools/` directory is dead code
in the generated tree — fixing it is a deletion, not a refactor, and the
patch should be reviewable in under 60 seconds. Keeping it as its own
issue lets a maintainer land it on a fast-merge branch without blocking
on the runner-hash or test-layout discussions.
