# Issue 2 — `genlayer-js` is declared twice with conflicting ranges in `genlayer new` output

**Repo:** `genlayerlabs/genlayer-cli`
**Severity:** High
**Targets:** `templates/default/package.json:3`, `templates/default/app/package.json` (the `"genlayer-js"` line)

## Problem

The generated project pins `genlayer-js` in two places with two different
ranges. The root asks for `^0.9.0`; the frontend app asks for `0.8.0`
exact. The two `package.json` files are not an npm workspace (there is no
`workspaces` field), so `app/` gets its own independent `node_modules` and
its own resolved `genlayer-js` version — confirmed below. The project
ships two different `genlayer-js` versions on disk. Two versions of one
SDK coexisting in a single project is a latent hazard and a maintenance
smell regardless of whether the two versions currently happen to
interoperate.

Verbatim from
[`templates/default/package.json`](https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/templates/default/package.json):

```json
{
  "name": "genlayer-project",
  "type": "module",
  "devDependencies": {
    "genlayer-js": "^0.9.0"
  }
}
```

Verbatim from
[`templates/default/app/package.json`](https://raw.githubusercontent.com/genlayerlabs/genlayer-cli/main/templates/default/app/package.json):

```json
"dependencies": {
  "genlayer-js": "0.8.0",
  ...
}
```

## Repro

Actual, verbatim output (`genlayer new probe2check`, then `npm install` in
both the root and `app/`):

```
$ npm install
added 211 packages in 20s

$ npm ls genlayer-js
genlayer-project@ .../probe2check
└── genlayer-js@0.9.0

$ cd app && npm install
added 319 packages in 46s

$ npm ls genlayer-js
app@0.0.0 .../probe2check/app
└── genlayer-js@0.8.0
```

Two independent `node_modules` trees (there is no `workspaces` field
tying them together), two resolved versions of the same SDK.

## Suggested fix

Pick one source of truth. The cleanest options, in order of preference:

1. **Move `genlayer-js` to `dependencies` in the root `package.json` only**,
   delete it from `app/package.json`, and have the Vite app resolve it from
   the workspace root. `npm create vite@latest` apps already do this and the
   `tsconfig.json` paths option is not needed for Vite.
2. If a workspace monorepo is too invasive a change, **pin both to the same
   exact version** (e.g. `"0.9.0"` in both files) so there is only one
   resolved version on disk, even without a workspace.

Either way, do not ship a project where the root and the app declare
different version ranges for the same SDK. That is how future maintainers
end up debugging "works in dev, breaks after `npm install` in CI."

## Note on coexistence with Issue 1

This is filed separately because it is an `npm` dependency problem, not a
runner-hash or Python dependency problem. A user can hit this even with
Issue 1 fixed.
