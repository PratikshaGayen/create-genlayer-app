import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProgram } from "../src/cli.js";
import { copyTemplate, type Manifest } from "../src/template.js";
import { templateDir } from "../src/paths.js";

/**
 * Snapshot-style integration test: we scaffold every (template, frontend)
 * combination into a throwaway dir, walk the resulting tree, and compare
 * it to a recorded snapshot. The snapshot is intentionally explicit
 * (list of files + their contents) rather than a binary blob so a
 * reviewer can read the diff when the template changes.
 *
 * If the template is updated, run `vitest -u` to refresh the snapshot.
 */

interface FileSnapshot {
  [relPath: string]: string;
}

const BASE_VARS = {
  PROJECT_NAME: "snapshot-fixture",
  PROJECT_NAME_KEBAB: "snapshot-fixture",
  TEMPLATE: "minimal",
  FRONTEND: "react",
  FRONTEND_EXT: "tsx",
  RUNNER_HASH_PY: "1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6",
  GENLAYER_JS_VERSION: "0.9.0",
  GENLAYER_TEST_VERSION: "0.29.2",
  GENVM_LINTER_VERSION: "0.11.0",
  CLI_VERSION: "0.0.0-test",
};

const COMBINATIONS = [
  { template: "minimal", frontend: "react" },
  { template: "minimal", frontend: "vue" },
  { template: "llm", frontend: "react" },
  { template: "llm", frontend: "vue" },
] as const;

interface Fixture {
  files: FileSnapshot;
  contractFile: string;
  contractHeader: string;
}

const fixtures: Record<string, Fixture> = {};

beforeAll(async () => {
  for (const { template, frontend } of COMBINATIONS) {
    const tplDir = templateDir(template);
    const manifest = JSON.parse(
      await readFile(join(tplDir, "manifest.json"), "utf8"),
    ) as Manifest;
    const vars = {
      ...BASE_VARS,
      TEMPLATE: template,
      FRONTEND: frontend,
      FRONTEND_EXT: frontend === "react" ? "tsx" : "ts",
    };
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
    const work = await mkdtemp(join(tmpdir(), "cga-snap-"));
    await copyTemplate(tplDir, work, themedManifest, vars);
    // The CLI renames the per-frontend package/tsconfig/vite config to
    // their canonical names. Mirror that here so the snapshot reflects
    // the post-rename state the user gets.
    const { rename: fsRename } = await import("node:fs/promises");
    for (const [from, to] of [
      [`app/package.${frontend}.json`, "app/package.json"],
      [`app/tsconfig.${frontend}.json`, "app/tsconfig.json"],
      [`app/vite.config.${frontend}.ts`, "app/vite.config.ts"],
    ]) {
      try {
        await fsRename(join(work, from), join(work, to));
      } catch {
        // file may not exist in some combinations
      }
    }
    const files = await walkAndRead(work, work);
    const contractFile =
      template === "llm" ? "contracts/wizard_of_coin.py" : "contracts/storage.py";
    fixtures[`${template}-${frontend}`] = {
      files,
      contractFile,
      contractHeader: files[contractFile]?.split("\n", 1)[0] ?? "",
    };
    await rm(work, { recursive: true, force: true });
  }
}, 60_000);

for (const { template, frontend } of COMBINATIONS) {
  const key = `${template}-${frontend}`;
  const contractFile = template === "llm" ? "wizard_of_coin.py" : "storage.py";
  const altFrontend = frontend === "react" ? "vue" : "react";

  describe(`${key} — generated tree`, () => {
    it("contains the expected top-level files", () => {
      const expected = [
        "README.md",
        "package.json",
        "requirements.txt",
        "gltest.config.yaml",
        ".gitignore",
        `${contractFile === "wizard_of_coin.py" ? "contracts/wizard_of_coin.py" : "contracts/storage.py"}`,
        "contracts/__init__.py",
        "tests/direct/conftest.py",
        "tests/direct/__init__.py",
        `tests/direct/test_${template === "llm" ? "wizard_of_coin" : "storage"}.py`,
        "tests/integration/README.md",
        "app/README.md",
        "app/index.html",
        "app/package.json",
        "app/tsconfig.json",
        "app/vite.config.ts",
        `app/src/${frontend}/main.${frontend === "react" ? "tsx" : "ts"}`,
        `app/src/${frontend}/App.${frontend === "react" ? "tsx" : "vue"}`,
        `app/src/${frontend}/lib/genlayer.ts`,
        `app/src/${frontend}/lib/wallet.ts`,
        `app/src/${frontend}/components/ContractCard.${frontend === "react" ? "tsx" : "vue"}`,
        "app/.env.example",
        "app/style.css",
      ];
      const actual = Object.keys(fixtures[key].files)
        .filter((p) => !p.includes("node_modules") && !p.startsWith("app/public"))
        .sort();
      expect(actual).toEqual(expected.sort());
    });

    it("never contains py-genlayer:test or py-genlayer:latest in source/config files", () => {
      const SOURCE_PREFIXES = [
        "contracts/",
        "tests/",
        "app/src/",
        "package.json",
        "app/package.json",
        "requirements.txt",
        "gltest.config.yaml",
      ];
      for (const [path, body] of Object.entries(fixtures[key].files)) {
        if (!SOURCE_PREFIXES.some((p) => path === p || path.startsWith(p))) continue;
        expect(body, `unexpected alias in ${path}`).not.toMatch(
          /py-genlayer:(test|latest)\b/,
        );
      }
    });

    it("declares genlayer-js at exactly one version across the whole tree", () => {
      const matches: string[] = [];
      for (const [path, body] of Object.entries(fixtures[key].files)) {
        const m = body.match(/"genlayer-js"\s*:\s*"([^"]+)"/g);
        if (m) matches.push(...m.map((s) => `${path}: ${s}`));
      }
      matches.sort();
      expect(matches).toEqual([
        'app/package.json: "genlayer-js": "0.9.0"',
        'package.json: "genlayer-js": "0.9.0"',
      ]);
    });

    it("pins the GenVM runner hash to the documented value", () => {
      expect(fixtures[key].contractHeader).toBe(
        `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`,
      );
    });

    it("includes genvm-linter in requirements.txt", () => {
      expect(fixtures[key].files["requirements.txt"]).toMatch(
        /^genvm-linter==0\.11\.0$/m,
      );
    });

    it("ships tests/direct using the canonical fixture names", () => {
      const testFiles = Object.keys(fixtures[key].files)
        .filter((p) => p.startsWith("tests/direct/test_") && p.endsWith(".py"))
        .sort();
      // llm template ships one test file (the equivalence-principle +
      // string-parsing path are both exercised through the same
      // `direct_deploy` + `direct_vm.mock_llm` flow).
      const expected = [
        `tests/direct/test_${template === "llm" ? "wizard_of_coin" : "storage"}.py`,
      ];
      expect(testFiles).toEqual(expected);
      const gltestTest = fixtures[key].files[testFiles[0]];
      for (const fixture of ["direct_vm", "direct_deploy"]) {
        expect(gltestTest, `gltest-driven test must use ${fixture}`).toContain(
          fixture,
        );
      }
    });

    it("contains no tools/ vendored JSON-RPC directory", () => {
      expect(
        Object.keys(fixtures[key].files).some((p) => p.startsWith("tools/")),
      ).toBe(false);
    });

    it("only ships the chosen frontend's source tree", () => {
      expect(
        Object.keys(fixtures[key].files).some(
          (p) => p.startsWith(`app/src/${altFrontend}/`),
        ),
      ).toBe(false);
    });

    it("wires a wallet flow in the chosen frontend", () => {
      const wallet = fixtures[key].files[`app/src/${frontend}/lib/wallet.ts`];
      expect(wallet, "wallet.ts missing").toBeDefined();
      expect(wallet).toContain("eth_requestAccounts");
    });

    it("index.html points at the chosen frontend's entry file", () => {
      const html = fixtures[key].files["app/index.html"];
      const ext = frontend === "react" ? "tsx" : "ts";
      expect(html).toContain(`/src/${frontend}/main.${ext}`);
    });
  });
}

describe("CLI argument parsing", () => {
  it("rejects unsupported templates", async () => {
    const program = buildProgram();
    program.exitOverride();
    await expect(
      program.parseAsync(["node", "create-genlayer-app", "x", "--template", "nope"]),
    ).rejects.toThrow(/Unsupported template/);
  });

  it("rejects unsupported frontends", async () => {
    const program = buildProgram();
    program.exitOverride();
    await expect(
      program.parseAsync(["node", "create-genlayer-app", "x", "--frontend", "svelte"]),
    ).rejects.toThrow(/Unsupported frontend/);
  });
});

async function walkAndRead(root: string, base: string): Promise<FileSnapshot> {
  const out: FileSnapshot = {};
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile()) {
        const rel = p.slice(base.length + 1).split("\\").join("/");
        out[rel] = await readFile(p, "utf8");
      }
    }
  }
  await walk(root);
  return out;
}
