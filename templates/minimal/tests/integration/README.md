# Integration tests

This directory is for tests that need a real GenLayer environment
(Studio, `glsim`, or testnet) and therefore exercise the full consensus
path. They run via `gltest`, not `pytest`, and require a running backend.

The `minimal` template ships with no integration tests by default —
direct-mode tests cover the storage surface. Add files here when you
need to validate consensus, real web/LLM calls, or pre-deployment
behaviour.

Run with:

```sh
# default network from gltest.config.yaml
gltest tests/integration/ -v -s

# explicit network
gltest tests/integration/ -v -s --network studionet
gltest tests/integration/ -v -s --network testnet_asimov
```

See `https://github.com/genlayerlabs/skills` → `genlayer-dev` →
`integration-tests` for the full pattern.
