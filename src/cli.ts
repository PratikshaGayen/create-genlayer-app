import { Command } from "commander";
import { run } from "./run.js";
import { packageInfo } from "./version.js";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("create-genlayer-app")
    .description(
      "Scaffold a GenLayer intelligent-contract project. " +
        "Fixes the defects in `genlayer new` v0.39.1 (see docs/GAP-ANALYSIS.md).",
    )
    .version(packageInfo.version)
    .argument("[project-name]", "Project name (also used as the directory name)")
    .option(
      "-t, --template <name>",
      "Template to scaffold. One of: minimal, llm.",
      "minimal",
    )
    .option(
      "-f, --frontend <name>",
      "Frontend stack. One of: react, vue.",
      "react",
    )
    .option(
      "--no-install",
      "Skip running the package manager after scaffolding.",
    )
    .option(
      "-y, --yes",
      "Use defaults for every prompt; do not ask interactively.",
    )
    .option(
      "--overwrite",
      "Overwrite the target directory if it already exists and is not empty.",
      false,
    )
    .action(async (projectName: string | undefined, opts) => {
      await run({ projectName, ...opts });
    });

  return program;
}
