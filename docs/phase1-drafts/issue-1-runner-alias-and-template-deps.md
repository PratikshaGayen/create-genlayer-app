# Issue 1 — `genlayer new` template pins a local-only runner alias; generated contract cannot deploy to testnet

**Repo:** `genlayerlabs/genlayer-cli`
**Severity:** Critical (first-run blocker — generated code does not work on any GenLayer network)
**Targets:** `templates/default/contracts/football_bets.py:1` and `templates/default/requirements.txt:5`

## Problem

`genlayer new` ships a contract whose `# { "Depends": ... }` header references
`py-genlayer:test`, a local-only alias. The contract cannot be deployed to
testnet or mainnet — it works only inside a specially configured local
Studio with a GenLayer developer environment variable. A user following the
README end to end ("Deploy the contract from `/contracts/football_bets.py`
using the Studio's UI") gets a contract that the network rejects as soon as
they point a non-local Studio at it.

Verbatim from
[`templates/default/contracts/football_bets.py:1`](https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/templates/default/contracts/football_bets.py):

```python
# { "Depends": "py-genlayer:test" }
```

`test`, `latest`, and any unversioned `py-genlayer` are explicitly rejected by
all GenLayer networks. This is stated verbatim in the official GenLayer
`genlayer-dev` skill (`plugins/genlayer-dev/skills/write-contract/SKILL.md` in
[`genlayerlabs/skills`](https://github.com/genlayerlabs/skills)):

> "All GenLayer networks reject `py-genlayer:test`, `py-genlayer:latest`, and
> unversioned runner aliases. Every generated contract MUST start with a
> pinned runner dependency header."

The same template's `requirements.txt` (verbatim from
[`templates/default/requirements.txt`](https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/templates/default/requirements.txt))
also pins `genlayer-test==0.1.1` and omits `genvm-linter`, so a user
following the README cannot run the validator or lint the contract at all:

```
requests==2.32.2
python-dotenv==1.0.1
eth-account==0.13.3
eth-utils==5.0.0
genlayer-test==0.1.1
```

## Repro

```bash
npm install -g genlayer          # currently 0.39.1
genlayer new probe
genlayer network set testnet_asimov
genlayer deploy --contract probe/contracts/football_bets.py
# → "runner 'test' not found" / deployment refused, no recoverable error path
```

## Suggested fix

1. Replace `templates/default/contracts/football_bets.py:1` with a pinned
   runner hash. The current pin published by GenLayer is:

   ```python
   # { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
   ```

   This hash is sourced from
   [`genlayerlabs/skills` → `plugins/genlayer-dev/skills/write-contract/SKILL.md`](https://raw.githubusercontent.com/genlayerlabs/skills/main/plugins/genlayer-dev/skills/write-contract/SKILL.md).
   It corresponds to the runners shipped in
   [`genvm-runners-all.tar.xz` on the `genlayerlabs/genvm` v0.3.0-rc7 release](https://github.com/genlayerlabs/genvm/releases/tag/v0.3.0-rc7).

2. Add `genvm-linter` to `requirements.txt` so users can run
   `genvm-lint check contracts/football_bets.py` as the skill prescribes. Pin
   the current latest (`genvm-linter==0.11.0`); confirm via
   `pip index versions genvm-linter` before tagging.

3. Drop the over-pinned `genlayer-test==0.1.1` in favour of a floor pin
   (e.g. `genlayer-test>=0.20,<1.0`) — verified on Python 3.14.3 that the
   current `0.29.2` installs cleanly and that the test plugin's
   `gltest`/`direct-tests` API is what the README already invokes
   (`gltest`).

## Why one issue, not two

The runner alias and the missing linter share one root cause: the template
files in `templates/default/` were last touched when the runner namespace
was pre-publication. Fixing the runner header without adding the linter
leaves users with a deployable contract they still cannot validate; adding
the linter without fixing the runner leaves them with a contract the network
rejects. Both are template-dependency defects and should ship together.
