import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { Command } from "commander";
import { detectPackageManager, installCommand, type PackageManager } from "./pm.js";
import { ensureAbsolute, isEmptyDir, rmrf, templateDir, templatesRoot } from "./paths.js";
import { copyTemplate, type Manifest } from "./template.js";
import { packageInfo } from "./version.js";

export interface RunOptions {
  projectName?: string;
  template?: string;
  frontend?: string;
  install?: boolean; // commander turns --no-install into `install: false`
  yes?: boolean;
  overwrite?: boolean;
}

const SUPPORTED_TEMPLATES = ["minimal", "llm"] as const;
const SUPPORTED_FRONTENDS = ["react", "vue"] as const;
type SupportedTemplate = (typeof SUPPORTED_TEMPLATES)[number];
type SupportedFrontend = (typeof SUPPORTED_FRONTENDS)[number];

// Pinned values from docs/GAP-ANALYSIS.md §1 and §2.
const RUNNER_HASH_PY = "1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6";
const GENLAYER_JS_VERSION = "0.9.0"; // single source of truth, see defect #2
const GENLAYER_TEST_VERSION = "0.29.2";
const GENVM_LINTER_VERSION = "0.11.0";

export async function run(
  rawOpts: RunOptions,
  program?: Command,
): Promise<void> {
  const opts = normaliseOptions(rawOpts);
  const cwd = process.cwd();

  // 1. Project name
  let name = opts.projectName;
  if (!name) {
    if (opts.yes) {
      throw new CliError("Missing project name and --yes set; nothing to do.");
    }
    const answer = await p.text({
      message: "Project name:",
      placeholder: "my-genlayer-app",
      validate: (v) => validateName(v) ?? undefined,
    });
    if (p.isCancel(answer)) {
      p.cancel("Cancelled.");
      return;
    }
    name = answer;
  }
  const projectNameError = validateName(name);
  if (projectNameError) throw new CliError(projectNameError);

  // 2. Target directory
  const target = ensureAbsolute(name, cwd);

  // 3. Template
  const template = await pickChoice<SupportedTemplate>(
    "Template",
    opts.template,
    opts.yes ?? false,
    [...SUPPORTED_TEMPLATES],
  );

  // 4. Frontend
  const frontend = await pickChoice<SupportedFrontend>(
    "Frontend",
    opts.frontend,
    opts.yes ?? false,
    [...SUPPORTED_FRONTENDS],
  );

  // 5. Overwrite guard
  if (existsSync(target) && !(await isEmptyDir(target))) {
    if (!opts.overwrite) {
      throw new CliError(
        `Target directory ${target} is not empty.\n` +
          `Re-run with --overwrite to replace it, or choose a different name.`,
      );
    }
    p.log.warn(`Overwriting non-empty directory: ${target}`);
    await rmrf(target);
  }

  // 6. Resolve template + manifest
  const tplDir = templateDir(template);
  if (!existsSync(tplDir)) {
    throw new CliError(`Template '${template}' not found at ${tplDir}`);
  }
  const manifest = await readManifest(tplDir);

  // 7. Variables
  const vars = buildVars({
    projectName: name,
    template,
    frontend,
  });

  // 7b. Tell the template to drop the alternate-frontend files. The
  // template ships both `app/src/react/` and `app/src/vue/` variants;
  // we keep only the one for the chosen frontend. Each template also
  // ships a `package.<frontend>.json` and a `tsconfig.<frontend>.json`
  // so the package.json does not have to know which framework is in
  // use; we drop the other one.
  const altFrontend = frontend === "react" ? "vue" : "react";
  const themedManifest: Manifest = {
    ...manifest,
    exclude: [
      `app/src/${altFrontend}`,
      `app/package.${altFrontend}.json`,
      `app/tsconfig.${altFrontend}.json`,
      `app/vite.config.${altFrontend}.ts`,
    ],
  };

  // 8. Copy
  const s = p.spinner();
  s.start(`Scaffolding ${template} (${frontend}) at ${target}`);
  const result = await copyTemplate(tplDir, target, themedManifest, vars);

  // 8b. Rename per-frontend file variants to their canonical names.
  // Each template ships `app/package.<frontend>.json`,
  // `app/tsconfig.<frontend>.json`, and `app/vite.config.<frontend>.ts`;
  // we now rename them to the names Vite/Vue/React expect.
  for (const suffix of ["json", "ts"]) {
    const ext = suffix === "ts" ? ".ts" : ".json";
    const typed = suffix === "ts" ? "ts" : "json";
    if (typed === "ts" && suffix === "ts") {
      await safeRename(
        join(target, "app", `vite.config.${frontend}.ts`),
        join(target, "app", "vite.config.ts"),
      );
    }
    if (typed === "json") {
      await safeRename(
        join(target, "app", `package.${frontend}.json`),
        join(target, "app", "package.json"),
      );
      await safeRename(
        join(target, "app", `tsconfig.${frontend}.json`),
        join(target, "app", "tsconfig.json"),
      );
    }
  }

  s.stop(
    `Scaffolded ${result.filesWritten} files` +
      (result.tokensReplaced
        ? `, replaced ${result.tokensReplaced} tokens`
        : ""),
  );

  // 9. Install (optional)
  const pm = detectPackageManager();
  const shouldInstall = opts.install !== false;
  if (shouldInstall) {
    await runInstall(target, pm);
  } else {
    p.log.info(`Skipped install (--no-install). Run the package manager yourself in ${target}.`);
  }

  const contractFile = template === "llm" ? "wizard_of_coin.py" : "storage.py";
  p.outro(
    `Done. Next:\n  cd ${name}\n  genvm-lint check contracts/${contractFile}\n  pytest tests/direct/ -v`,
  );

  // Suppress unused-var noise for `program` (kept for future hooks).
  void program;
}

function normaliseOptions(raw: RunOptions): RunOptions {
  return {
    projectName: raw.projectName,
    template: raw.template ?? "minimal",
    frontend: raw.frontend ?? "react",
    install: raw.install !== false,
    yes: raw.yes === true,
    overwrite: raw.overwrite === true,
  };
}

function validateName(name: string): string | null {
  if (!name) return "Project name is required.";
  if (name.length > 214) return "Project name is too long (max 214 chars).";
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
    return "Project name must start with a letter or digit and contain only letters, digits, '.', '_' or '-'.";
  }
  return null;
}

async function pickChoice<T extends string>(
  label: string,
  supplied: string | undefined,
  yes: boolean,
  options: readonly T[],
): Promise<T> {
  if (supplied) {
    if (!options.includes(supplied as T)) {
      throw new CliError(
        `Unsupported ${label.toLowerCase()} '${supplied}'. Supported: ${options.join(", ")}`,
      );
    }
    return supplied as T;
  }
  if (yes) {
    return options[0];
  }
  const answer = await p.select({
    message: `${label}:`,
    options: options.map((o) => ({ value: o, label: o })),
  });
  if (p.isCancel(answer)) {
    p.cancel("Cancelled.");
    return options[0]; // unreachable; satisfies the type checker
  }
  return answer as T;
}

async function readManifest(tplDir: string): Promise<Manifest> {
  const path = resolve(tplDir, "manifest.json");
  if (!existsSync(path)) {
    throw new CliError(`Template manifest not found: ${path}`);
  }
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Manifest;
}

interface VarsInput {
  projectName: string;
  template: string;
  frontend: string;
}

function buildVars({ projectName, template, frontend }: VarsInput): Record<string, string> {
  const FRONTEND_EXT = frontend === "react" ? "tsx" : "ts";
  return {
    PROJECT_NAME: projectName,
    PROJECT_NAME_KEBAB: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    TEMPLATE: template,
    FRONTEND: frontend,
    FRONTEND_EXT,
    RUNNER_HASH_PY,
    GENLAYER_JS_VERSION,
    GENLAYER_TEST_VERSION,
    GENVM_LINTER_VERSION,
    CLI_VERSION: packageInfo.version,
  };
}

async function runInstall(cwd: string, pm: PackageManager): Promise<void> {
  const { cmd, args } = installCommand(pm, cwd);
  const s = p.spinner();
  s.start(`Running ${cmd} ${args.join(" ")} in ${cwd}`);
  try {
    const { spawn } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, args, { cwd, stdio: "ignore", shell: process.platform === "win32" });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${cmd} exited with code ${code}`));
      });
    });
    s.stop(`${cmd} install complete.`);
  } catch (err) {
    s.stop(`${cmd} install failed.`, 1);
    p.log.warn(
      `Install failed: ${(err as Error).message}\n` +
        `You can install manually with the same command.`,
    );
  }
}

async function safeRename(from: string, to: string): Promise<void> {
  const { existsSync } = await import("node:fs");
  if (!existsSync(from)) return;
  await rename(from, to);
}

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

export const __test = {
  validateName,
  buildVars,
  normaliseOptions,
  templatesRoot,
  SUPPORTED_TEMPLATES,
  SUPPORTED_FRONTENDS,
  RUNNER_HASH_PY,
  GENLAYER_JS_VERSION,
  GENVM_LINTER_VERSION,
  FRONTEND_EXT_FOR: (f: string) => (f === "react" ? "tsx" : "ts"),
};
