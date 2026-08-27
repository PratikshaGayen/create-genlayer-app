import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the path to the bundled `templates/` directory. Works both in
 * source (`src/`) and in the built artifact (`dist/`), because both live
 * one level under the package root.
 */
export function templatesRoot(): string {
  return resolve(here, "..", "templates");
}

export function templateDir(name: string): string {
  return join(templatesRoot(), name);
}

/**
 * Decide whether a directory is empty (so it is safe to write into).
 * Returns `true` when the path is missing, when it exists but is empty,
 * or when it contains only ignored entries (none today).
 */
export async function isEmptyDir(p: string): Promise<boolean> {
  if (!existsSync(p)) return true;
  const entries = await readdir(p);
  return entries.length === 0;
}

export function ensureAbsolute(path: string, cwd: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

/**
 * Remove a directory and all of its contents. Used to honour `--overwrite`.
 * Refuses to delete anything outside of `cwd` unless the caller passes the
 * resolved absolute path.
 */
export async function rmrf(p: string): Promise<void> {
  await rm(p, { recursive: true, force: true });
}
