# Integration tests

This directory is for tests that need a real GenLayer environment
(Studio, `glsim`, or testnet) and therefore exercise the full consensus
path. They run via `gltest`, not `pytest`, and require a running backend.

The `llm` template ships with no integration tests by default — direct-mode
tests cover the equivalence-principle path. Add files here when you need
to validate real LLM calls and multi-validator consensus end to end.

Run with:

```sh
gltest tests/integration/ -v -s                              # default network
gltest tests/integration/ -v -s --network studionet         # hosted Studio (gasless)
gltest tests/integration/ -v -s --network testnet_asimov
```

See `https://github.com/genlayerlabs/skills` → `genlayer-dev` →
`integration-tests` for the full pattern.
