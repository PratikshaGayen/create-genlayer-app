import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

/**
 * Per-template manifest. Lives at `templates/<name>/manifest.json` and
 * drives token replacement. Anything not listed is copied verbatim.
 */
export interface Manifest {
  name: string;
  description: string;
  tokens: string[];
  /**
   * Optional list of relative paths to skip during copy. Used to drop
   * the alternate-frontend files when only one frontend is selected.
   */
  exclude?: string[];
  /**
   * File globs (relative to the template root) that should be made
   * executable after copying. Used for the shebang-less CLI scripts we
   * might add later; empty for `minimal`.
   */
  executable?: string[];
}

export interface CopyResult {
  filesWritten: number;
  tokensReplaced: number;
}

const TOKEN_RX = /__([A-Z][A-Z0-9_]+)__/g;

/**
 * Recursively copy `srcRoot` into `dstRoot`, replacing any `__TOKEN__`
 * occurrence in file contents and in file/directory names with the
 * matching entry from `vars`. Skips the manifest itself and any path
 * listed in `manifest.exclude`.
 */
export async function copyTemplate(
  srcRoot: string,
  dstRoot: string,
  manifest: Manifest,
  vars: Record<string, string>,
): Promise<CopyResult> {
  let filesWritten = 0;
  let tokensReplaced = 0;
  const exclude = manifest.exclude ?? [];

  async function walk(srcDir: string, dstDir: string): Promise<void> {
    await mkdir(dstDir, { recursive: true });
    const entries = await readDirSorted(srcDir);

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const renamed = renameToken(entry.name, vars);
      if (renamed.replaced) tokensReplaced += renamed.replaced;
      const dstPath = join(dstDir, renamed.name);
      const relPath = relativeTo(srcRoot, srcPath);

      if (exclude.some((p) => p === relPath || relPath.startsWith(p + "/"))) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(srcPath, dstPath);
        continue;
      }

      if (entry.name === "manifest.json") continue;

      await mkdir(dirname(dstPath), { recursive: true });

      const raw = await readFile(srcPath, "utf8");
      const replaced = replaceTokensInString(raw, vars);
      if (replaced.replaced) tokensReplaced += replaced.replaced;
      await writeFile(dstPath, replaced.text, "utf8");
      filesWritten += 1;
    }
  }

  await walk(srcRoot, dstRoot);
  return { filesWritten, tokensReplaced };
}

function renameToken(
  name: string,
  vars: Record<string, string>,
): { name: string; replaced: number } {
  let replaced = 0;
  const out = name.replace(TOKEN_RX, (m, key: string) => {
    if (!(key in vars)) return m;
    replaced += 1;
    return vars[key];
  });
  return { name: out, replaced };
}

function replaceTokensInString(
  text: string,
  vars: Record<string, string>,
): { text: string; replaced: number } {
  let replaced = 0;
  const out = text.replace(TOKEN_RX, (m, key: string) => {
    if (!(key in vars)) return m;
    replaced += 1;
    return vars[key];
  });
  return { text: out, replaced };
}

interface DirEntry {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

async function readDirSorted(p: string): Promise<DirEntry[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(p, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    isDirectory: () => e.isDirectory(),
    isFile: () => e.isFile(),
  }));
}

export function relativeTo(root: string, p: string): string {
  return relative(root, p).split("\\").join("/");
}
