/**
 * Detect the package manager that invoked the CLI.
 *
 * The npm CLI sets `npm_config_user_agent` to a string like
 *   "npm/10.8.2 node/v20.18.0 win32 x64"
 * or, for pnpm/yarn/bun, the same key carries their user agent. This is the
 * same heuristic `create-vite`, `create-next-app` and `nuxi` use.
 *
 * Falls back to `npm` when nothing recognisable is set (e.g. running
 * `node dist/index.js` directly from a script).
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export function detectPackageManager(
  env: NodeJS.ProcessEnv = process.env,
): PackageManager {
  const ua = env.npm_config_user_agent ?? "";
  if (/\bbun\//.test(ua)) return "bun";
  if (/\bpnpm\//.test(ua)) return "pnpm";
  if ((/\byarn\//.test(ua) || /\byarn\?/.test(ua)) && !/\bnpm\//.test(ua))
    return "yarn";
  return "npm";
}

export function installCommand(
  pm: PackageManager,
  cwd: string,
): { cmd: string; args: string[] } {
  switch (pm) {
    case "pnpm":
      return { cmd: "pnpm", args: ["install", "--prefer-offline"] };
    case "yarn":
      return { cmd: "yarn", args: ["install"] };
    case "bun":
      return { cmd: "bun", args: ["install"] };
    case "npm":
    default:
      return { cmd: "npm", args: ["install", "--no-audit", "--no-fund"] };
  }
}

export { detectPackageManager as _detectPackageManager };
