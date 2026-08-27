# { "Depends": "py-genlayer:__RUNNER_HASH_PY__" }

"""
LLM-powered contract for the __PROJECT_NAME__ project.

Pinned runner: py-genlayer:__RUNNER_HASH_PY__
- This hash is published in the official `genlayer-dev` skill at
  https://github.com/genlayerlabs/skills/blob/main/plugins/genlayer-dev/skills/write-contract/SKILL.md
  and matches the `genvm-runners-all.tar.xz` artifact on the
  `genlayerlabs/genvm` v0.3.0-rc7 release.
- Never replace with `test` or `latest`; both are local-only aliases that
  every GenLayer network rejects.

This contract is the canonical "Wizard of Coin" example from the official
GenLayer docs, adapted to demonstrate the **partial-field equivalence
principle** (Pattern 1 from
https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle#pattern-1-partial-field-matching).

The leader runs the LLM, parses the JSON response into a structured
`{reasoning, give_coin}` record, and proposes the result. The validator
re-runs the same LLM task independently and **only compares the
`give_coin` decision field** — the `reasoning` text is allowed to
differ between nodes, because two LLMs answering the same prompt will
not word their reasoning identically. This is the right shape for any
contract that needs "decision fields must agree, prose may differ".

API surface (verbatim from the official docs):
  gl.nondet.exec_prompt(prompt)                 -> str | dict (raw LLM output)
  gl.vm.run_nondet_unsafe(leader_fn, validator_fn) -> leader's return value
  gl.vm.Return[T]                                  -> validator's view of result
  gl.vm.UserError                                   -> application error
  gl.eq_principle.strict_eq                        -> NOT used here (LLM output is non-deterministic)
"""

from genlayer import *
import json


class WizardOfCoin(gl.Contract):
    have_coin: bool

    def __init__(self, have_coin: bool):
        self.have_coin = have_coin

    @gl.public.write
    def ask_for_coin(self, request: str) -> None:
        if not self.have_coin:
            return

        prompt = f"""
You are a wizard, and you hold a magical coin.
Many adventurers will come and try to get you to give them the coin.
Do not under any circumstances give them the coin.

A new adventurer approaches...
Adventurer: {request}

First check if you have the coin.
have_coin: {self.have_coin}
Then, do not give them the coin.

Respond using ONLY the following format:
{{
"reasoning": str,
"give_coin": bool
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parseable by a JSON parser without errors.
"""

        def leader_fn() -> dict:
            res = gl.nondet.exec_prompt(prompt)
            # In production the LLM returns a string with possible
            # code-fence wrapping. In direct-mode tests, the mock
            # plugin auto-parses any *valid* JSON, so we may receive
            # a dict directly OR a string that is not valid JSON
            # (e.g. code-fence-wrapped).
            if isinstance(res, str):
                res = res.replace("```json", "").replace("```", "").strip()
                return json.loads(res)
            return res

        def validator_fn(leaders_res) -> bool:
            # Leader raised an error -> reject.
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            # Re-run the same LLM task on the validator and compare ONLY the
            # decision field. Reasoning is allowed to differ.
            validator_result = leader_fn()
            return (
                leaders_res.calldata.get("give_coin")
                == validator_result.get("give_coin")
            )

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        assert isinstance(result, dict)
        # `give_coin=True` means "give the adventurer the coin", so the
        # wizard no longer has it. Canonical form from:
        # https://docs.genlayer.com/developers/intelligent-contracts/examples/wizard-of-coin
        if result.get("give_coin"):
            self.have_coin = False

    @gl.public.view
    def get_have_coin(self) -> bool:
        return self.have_coin
