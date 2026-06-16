#!/usr/bin/env node
import {
  parseCli,
  printHelp,
  cliToConfig,
  needsInteractive,
  shouldSkipReview,
} from "../src/cli.js";
import { runInteractive } from "../src/prompts.js";
import { runAction, buildPreview } from "../src/runner.js";

async function main() {
  try {
    const cli = parseCli();

    if (cli.help) {
      printHelp();
      return;
    }

    if (needsInteractive(cli) && !process.stdin.isTTY) {
      console.error(`
AI-Quickstart interactive mode needs a real terminal (TTY).

This often fails when run as:
  powershell -Command "irm ... | iex"

Use one of these instead (in an open PowerShell window):

  npx.cmd -y github:aaron-axisa/AI-Quickstart

  Set-ExecutionPolicy -Scope Process Bypass
  irm https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.ps1 | iex

Non-interactive example:

  npx.cmd -y github:aaron-axisa/AI-Quickstart --path C:\\path\\to\\repo --preset full --platforms cursor -y
`);
      process.exit(1);
    }

    let config;
    let skipPlanPreview = false;

    if (needsInteractive(cli)) {
      config = await runInteractive(cli);
      skipPlanPreview = true;
    } else {
      if (!cli.path) {
        throw new Error("--path is required in non-interactive mode.");
      }
      if (!cli.tools.length) {
        throw new Error("--tools is required in non-interactive mode.");
      }
      if (!cli.platforms.length) {
        throw new Error("--platforms is required in non-interactive mode.");
      }
      config = cliToConfig(cli);
      config.installPrerequisites = cli.installPrerequisites;

      if (!shouldSkipReview(cli)) {
        console.log(buildPreview(config));
        throw new Error(
          "Review the plan above. Re-run with --yes to confirm or --non-interactive to skip review.",
        );
      }
    }

    await runAction(config, { skipPlanPreview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
    process.exit(1);
  }
}

main();
