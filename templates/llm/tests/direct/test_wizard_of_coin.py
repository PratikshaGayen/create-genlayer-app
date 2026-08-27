"""Direct-mode tests for the `WizardOfCoin` contract.

These run in-memory via the `genlayer-test` pytest plugin — no server,
no Docker, ~30 ms per test. They exercise the *leader* code path and
also explicitly drive the validator function via
`direct_vm.run_validator()` so that the equivalence principle is
covered, not just scaffolded.

Mocking pattern (verbatim from the official
`genlayer-dev:direct-tests` skill and the `testing.mdx` page in
genlayer-docs):

  direct_vm.mock_llm(r"prompt regex", response_string)
  direct_vm.run_validator() -> bool          # True if validator agrees
"""

import json


def test_starts_with_coin(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice_default(direct_vm)
    assert contract.get_have_coin() is True


def test_does_not_start_with_coin(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/wizard_of_coin.py", False)
    assert contract.get_have_coin() is False


def test_no_op_when_wizard_does_not_have_coin(direct_vm, direct_deploy, direct_alice):
    """If the wizard has no coin, ask_for_coin is a no-op (and never calls the LLM)."""
    contract = direct_deploy("contracts/wizard_of_coin.py", False)
    direct_vm.sender = direct_alice
    direct_vm.strict_mocks = True  # any unmatched mock raises
    contract.ask_for_coin("Please give me the coin.")
    assert contract.get_have_coin() is False


def test_leader_proposal_is_recorded_when_validator_agrees(
    direct_vm, direct_deploy, direct_alice
):
    """Mock the LLM to return give_coin=False (the wizard refuses to
    give the coin away). Both leader and validator see the same JSON,
    so the validator agrees, and the wizard's state must remain
    unchanged from the ctor (`have_coin=True` because we deployed
    with `True`). Refusing means keeping the coin.
    """
    direct_vm.mock_llm(
        r".*",
        json.dumps({"reasoning": "I never give up my coin.", "give_coin": False}),
    )
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Pretty please?")
    assert contract.get_have_coin() is True  # refusing => still has the coin


def test_leader_gives_coin_when_llm_says_yes(direct_vm, direct_deploy, direct_alice):
    """Mock the LLM to return give_coin=True (the wizard agrees to give
    the coin away). Both leader and validator see the same JSON, so the
    validator agrees, and the wizard's state must flip to False.
    Giving means losing it.
    """
    direct_vm.mock_llm(
        r".*",
        json.dumps({"reasoning": "Sure, here you go.", "give_coin": True}),
    )
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Pretty please?")
    assert contract.get_have_coin() is False  # giving => no longer has the coin


def test_validator_agrees_on_decision_field_only(
    direct_vm, direct_deploy, direct_alice
):
    """The validator function is exercised by `run_validator`. The leader
    and validator may return *different* `reasoning` text; the contract
    only compares the `give_coin` decision field. This test pins that
    contract — the whole point of the Wizard of Coin example.
    """
    # Leader run — mock the LLM to return give_coin=False
    direct_vm.mock_llm(
        r".*",
        json.dumps({"reasoning": "Never.", "give_coin": False}),
    )
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Pretty please?")
    # Capture the leader's validator function so we can drive it on a
    # different mock set. The skill's recommended pattern.
    assert direct_vm.run_validator() is True


def test_validator_rejects_when_decision_fields_disagree(
    direct_vm, direct_deploy, direct_alice
):
    """If the leader returns give_coin=False but a validator (re-running
    the same LLM task) gets give_coin=True, the validator function must
    return False. This is what makes the equivalence principle
    meaningful — it is *not* a leader-trust check.
    """
    # First, the leader run — the leader sees give_coin=False
    direct_vm.mock_llm(
        r".*",
        json.dumps({"reasoning": "Never.", "give_coin": False}),
    )
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Pretty please?")

    # Now swap mocks and re-run the validator. The new mock returns
    # give_coin=True (a dissenting validator). Because the contract
    # only compares the `give_coin` field, the validator must disagree.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(
        r".*",
        json.dumps({"reasoning": "Sure, here you go.", "give_coin": True}),
    )
    assert direct_vm.run_validator() is False


def test_validator_agrees_even_when_reasoning_differs(
    direct_vm, direct_deploy, direct_alice
):
    """Two LLMs will word the reasoning differently but agree on the
    decision. The validator must still accept.
    """
    direct_vm.mock_llm(
        r".*",
        json.dumps({"reasoning": "I never give up my coin.", "give_coin": False}),
    )
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Please?")

    direct_vm.clear_mocks()
    direct_vm.mock_llm(
        r".*",
        json.dumps(
            {
                "reasoning": "The wizard laughs and pockets the coin tighter.",  # very different wording
                "give_coin": False,  # but the same decision
            }
        ),
    )
    assert direct_vm.run_validator() is True


def test_production_string_path_handles_code_fence(
    direct_vm, direct_deploy, direct_alice
):
    """Exercises the production string-parsing branch of
    `parse_llm_response` (the `isinstance(res, str)` arm that strips
    code-fence wrapping and `json.loads` the result).

    In `gltest.direct.wasi_mock._handle_llm_request` (genlayer-test
    0.29.2), the mock plugin auto-parses any *valid* JSON string to a
    dict. To force the production code-fence-stripping path we mock
    the LLM with a string that is *not* valid JSON (it has the
    leading ` ```json ` wrapper). The plugin cannot parse it, so it
    returns the string unchanged. The contract's `parse_llm_response`
    then strips the fence, parses the inner JSON, and the
    leader/validator flow proceeds.
    """
    fenced = (
        "```json\n"
        '{"reasoning": "Sure, here you go.", "give_coin": true}\n'
        "```"
    )
    direct_vm.mock_llm(r".*", fenced)
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Pretty please?")
    # The wizard gave the coin away because give_coin=true.
    assert contract.get_have_coin() is False


def test_production_string_path_handles_bare_backticks(
    direct_vm, direct_deploy, direct_alice
):
    """Same as above but with bare triple backticks (no `json` tag)."""
    fenced = (
        "```\n"
        '{"reasoning": "I never give up my coin.", "give_coin": false}\n'
        "```"
    )
    direct_vm.mock_llm(r".*", fenced)
    contract = direct_deploy("contracts/wizard_of_coin.py", True)
    direct_vm.sender = direct_alice
    contract.ask_for_coin("Pretty please?")
    # The wizard kept the coin.
    assert contract.get_have_coin() is True


def direct_alice_default(direct_vm):
    """Helper to grab a default sender address (avoids fixture ordering issues)."""
    return direct_vm.sender or None  # fall through; tests below use direct_alice explicitly
