# __PROJECT_NAME__ — app

__FRONTEND__ + Vite frontend for the `Storage` contract in
`../contracts/storage.py`.

It uses `genlayer-js` at version `__GENLAYER_JS_VERSION__` (pinned in
the workspace-root `package.json` — do not import it from anywhere else).

## Configuring the contract address

Copy `.env.example` to `.env`:

```sh
cp .env.example .env
```

After deploying the contract:

```sh
genlayer deploy --contract contracts/storage.py
```

copy the address the CLI prints into `VITE_CONTRACT_ADDRESS` in `.env`.
