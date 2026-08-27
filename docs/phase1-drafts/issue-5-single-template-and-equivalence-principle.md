# Issue 5 — `genlayer new` has exactly one hardcoded template (football bets, Vue 3), and the template contradicts the documented boilerplate

**Repo:** `genlayerlabs/genlayer-cli`
**Severity:** Medium
**Targets:** `templates/default/contracts/football_bets.py`, `templates/default/app/`, `templates/default/README.md:9`

## Problem

`genlayer new <name>` produces the same project every time: a "Football
Bets" betting-game dApp on Vue 3. Two related problems:

1. **One hardcoded template.** Every first-run user — regardless of
   whether they want a betting app — gets `contracts/football_bets.py`,
   `app/src/components/BetsScreen.vue`, `app/src/logic/FootballBets.js`,
   `app/src/components/Address.vue`, and a README that introduces itself
   as "boilerplate code for a GenLayer use case implementation,
   specifically a football bets game." (Verbatim from
   [`templates/default/README.md:9`](https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/templates/default/README.md).)
   A developer who wants a counter, a token, or a simple storage demo
   has to delete the betting app's files before writing their own.

2. **Frontend choice contradicts older docs and the GenLayer differentiator.**
   The Vue 3 stack is fine on its own, but the app is built around an
   LLM call (`gl.exec_prompt` against BBC Sport) and a `gl.eq_principle_strict_eq`
   (which the official
   [`write-contract` skill](https://raw.githubusercontent.com/genlayerlabs/skills/main/plugins/genlayer-dev/skills/write-contract/SKILL.md)
   explicitly warns against for LLM/web outputs: *"Never use for LLM calls
   or web pages that change between requests"*). The template therefore
   ships a contract whose equivalence principle is the wrong one for its
   own use case, and the corresponding test (`test_football_bet.py`)
   relies on a mock validator that does not exercise real consensus.

## Repro

```bash
genlayer new not-a-betting-app
cd not-a-betting-app
grep -l "FootballBets\|football_bets\|BetsScreen" -r .
# → contracts/football_bets.py, app/src/components/BetsScreen.vue,
#   app/src/logic/FootballBets.js, README.md, …
# Every file is about a betting app, not about the user's actual idea.
```

## Suggested fix (smallest patch that ships value)

1. **Add a `--template` flag to `genlayer new`** accepting at least:
   - `minimal` — `Storage` contract with two methods, no LLM, no
     frontend. Matches the `genlayer-dev` skill's "Direct mode should
     cover most logic testing" guidance and runs `genvm-lint check`
     clean out of the box. This is the template a developer actually
     wants when they are evaluating GenLayer.
   - `llm` — the existing football-bets app, renamed to a generic
     "LLM-with-equivalence-principle" example so the README describes
     it as one of several examples, not the only thing the CLI builds.

   Keep the current `default` as an alias for `llm` for one release
   cycle to avoid breaking existing scripts, then deprecate it.

2. **Switch the equivalence principle in the betting example to
   `prompt_comparative` with a custom validator function** as the
   `write-contract` skill recommends for LLM outputs, so the example
   actually demonstrates the consensus path the user is meant to learn.

3. **Update `templates/default/README.md` line 9** to drop the
   "specifically a football bets game" line and describe the project
   as the example it is, not the only thing the CLI can build.

## Why one issue

A user who wants a Vue betting app is not a user who wants a React
counter. Two issues (one for "no template selection", one for "the
example teaches the wrong equivalence principle") would force a
maintainer to either merge them anyway or reject the wrong one.
