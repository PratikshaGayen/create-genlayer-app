import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Read package.json once at startup. We intentionally avoid `import {version}
// from "../../package.json"` so the source is portable to the bundled
// `dist/index.js` (where the relative path is different).
const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(here, "..", "package.json"), "utf8"),
) as { name: string; version: string };

export const packageInfo = { name: pkg.name, version: pkg.version };
