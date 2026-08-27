import { buildProgram } from "./cli.js";
import { CliError } from "./run.js";

async function main(): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof CliError) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
