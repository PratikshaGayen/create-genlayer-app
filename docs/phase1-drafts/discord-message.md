# Discord message — ready to paste into #developers

**Why this file exists:** GitHub Discussions are disabled on
`genlayer-cli` (confirmed via the API, 2026-08-26), and the only
`genlayerlabs` repo with Discussions enabled (`genvm`) is archived — a
post there would likely go unseen. Discord is the only viable venue for
asking the "where should this fix live?" question before filing issues.

Discord has a ~2000 character limit per message. The text below is one
message, well under that limit, written to stand alone without a table.
Post it, then link `docs/GAP-ANALYSIS.md` (or the repo) as a follow-up
if anyone asks for the full evidence.

---

Hi all — I've been going through `genlayer new` (CLI v0.39.1) and found a
few things worth flagging before I file issues, because one question
changes how I'd frame them.

**Headline finding:** the contract `genlayer new` scaffolds pins
`py-genlayer:test`, a local-only runner alias. Your own `genlayer-dev`
skill says all GenLayer networks reject that alias — so a first-run user
following the README ends up with a contract that can't deploy anywhere.
Four more issues stack on top of that (`genlayer-js` declared at two
different versions in one project, no `tests/direct/` split despite the
skills prescribing it, ~700 lines of unused vendored JSON-RPC, and the
one hardcoded template using an equivalence principle your own skill
warns against for LLM calls). All reproduced from a clean `genlayer new`,
evidence cited by file/line — happy to share the write-up.

I've built a `create-genlayer-app` scaffolder that fixes all of this
(pinned runner hash, single `genlayer-js` version, `tests/direct/` +
`tests/integration/`, no vendored plumbing, CI that re-scaffolds every
template on every commit so it can't rot the way the current one has).

Before I open 5 issues against `genlayer-cli`, I wanted to ask: would you
rather these land as upstream patches in `templates/default/` (the
runner-hash one is genuinely a one-line fix), or is there room for
`create-genlayer-app` as a standalone tool? Happy to go either way — just
didn't want to frame the issues wrong by guessing.

Thanks for reading this far 🙏

---

## Notes for the human (Pratiksha) — not part of the message

- Repo link, if you want to include one: your GitHub username is
  `PratikshaGayen`, repo is `create-genlayer-app` — paste the URL after
  posting if the channel supports it, or on request.
- If the channel is threaded, consider starting a thread with this as
  the first message so replies stay organized.
- Wait for a reply (a day or two is reasonable) before filing any of the
  5 issues in `docs/phase1-drafts/`.
