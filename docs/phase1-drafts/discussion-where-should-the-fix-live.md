# Discussion post — gap analysis of `genlayer new`, and a question on where the fix should live

**Where to post:** Discord `#developers` only. Confirmed via the GitHub
API (2026-08-26): GitHub Discussions are disabled on `genlayer-cli`, and
the only `genlayerlabs` repo with Discussions enabled (`genvm`) is
archived. This long-form version is kept as the source of record and
for reference if a maintainer asks for more detail after the Discord
message; the actual thing to post is the shorter
`docs/phase1-drafts/discord-message.md`.

---

Hi — I am Pratiksha. I have been working on a gap analysis of the project
that `genlayer new` produces (CLI v0.39.1, checked on 2026-08-25). I have
drafted five issues against this repo covering the template dependencies,
version drift, test layout, vendored JSON-RPC, and the single hardcoded
template. I am about to post them and I want to ask a question first,
because the answer changes how I file them.

## What I found

The full evidence is in a 2-page gap analysis
(`docs/GAP-ANALYSIS.md` in my project; the same content will land as the
five issue bodies). Headline findings, all reproduced from a clean
`genlayer new probe` on this machine:

- The shipped contract pins `py-genlayer:test`, which the official
  `genlayer-dev` skill (the one your own Skills page tells everyone to
  install) explicitly says *"all GenLayer networks reject"*. The contract
  cannot be deployed to testnet.
- `genlayer-js` is declared twice in the same generated project
  (`^0.9.0` at the root, `0.8.0` exact in `app/`).
- The template has a flat `test/` folder with no `tests/direct/`, no
  `tests/integration/`, and no `gltest.config.yaml` — yet the skills
  prescribe that exact layout and the README tells users to run
  `gltest` (which itself warns on first run that `gltest.config.yaml`
  is missing).
- Seven hand-rolled JSON-RPC files are vendored into every user project
  and imported by nothing.
- The single template is a Vue 3 football-bets dApp whose equivalence
  principle (`strict_eq`) is the one your own `write-contract` skill
  warns against for LLM/web calls.

The full table with file:line evidence is in the gap analysis; every
claim cites a file path, a command, or a URL.

## What I am doing about it

I have a separate project, `create-genlayer-app`, that I am building as
a stricter alternative to `genlayer new`: pinned runner hashes, single
source of truth for `genlayer-js`, the `tests/direct/` + `tests/integration/`
split, a `minimal` template and an `llm` template, no vendored JSON-RPC,
and a CI matrix that re-scaffolds the templates on every commit so the
output cannot rot the way the current one has.

I am posting five issues here rather than silently forking because the
defects are in your repo and the fix is genuinely a one-or-two-line
patch in `templates/default/`. I would much rather you ship the fix
than build a parallel tool that works around it.

## The question

There are two reasonable shapes for how this lands, and I would rather
hear your preference before posting:

1. **Upstream fixes in this repo.** I open the five issues, you (or
   anyone) pick them up, the patches land on the next `*-dev` branch
   and ship in the next `genlayer-cli` release. I close my
   `create-genlayer-app` project as no-longer-needed, or I keep it as
   an opinionated extra that builds on top of the fixed CLI.

2. **Standalone `create-genlayer-app` package.** The defects are real
   but you would rather invest the maintenance budget elsewhere; I
   ship a `npm create genlayer-app` package that produces a project
   matching the gap-analysis recommendations, and we leave a cross-link
   from this repo to mine. The five issues stay open as a public
   record of what the standalone tool is fixing.

The "do nothing" option is also fine but I would not recommend it —
defect #1 alone means a first-run user who follows the README ends up
with a contract the network rejects, which is not a state the docs
warn about.

Either way, I will not post the five issues until I hear from you,
because the question of where the fix lives changes the framing of the
issues (a "please fix this" issue reads differently from a "we are
working around this in a separate package, please consider fixing it"
issue).

Thanks for the time — looking forward to the team's read.

— Pratiksha

---

## Notes for the human (Pratiksha) — not part of the post

- This is a draft. The five issue files in `docs/phase1-drafts/` are
  also drafts. Do not post any of them until you decide on the
  question.
- If you want to soften the opening (e.g. "I am new to GenLayer"
  framing instead of "I have been working on a gap analysis"), or
  point at a different GitHub repo (e.g. `genlayer-labs/docs`), tell
  me and I will revise. The body is structured so each paragraph can
  be edited in isolation without breaking the others.
- If you want a Discord-flavoured version (shorter paragraphs, less
  table-heavy), say the word and I will produce a second cut.
- The post is intentionally not a sales pitch for `create-genlayer-app`
  — the goal is to give the team a clear, evidence-cited signal of
  where the current template breaks, and to ask where they want the
  fix to live. The standalone-tool outcome is mentioned only as a
  logistical option, not a recommendation.
