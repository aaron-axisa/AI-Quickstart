import path from "node:path";
import { resolvePlatforms } from "../platforms.js";
import { run, commandExists } from "../utils/exec.js";
import {
  speckitInitArgs,
  speckitInitCommand,
  speckitInstallArgs,
  speckitInstallCommand,
  speckitSupportsPlatform,
  isSpecifyInstallLockError,
} from "../platform-maps/speckit.js";
import { deleteDirIfExists } from "../utils/fs.js";
import { hasUv } from "../utils/detect.js";

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planInstallSpeckit(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [
    {
      tool: "speckit",
      description:
        "Install specify-cli globally (uv; skipped if already on PATH unless --force)",
      command: speckitInstallCommand(),
    },
  ];

  const supported = platforms.filter((p) => speckitSupportsPlatform(p.id));
  if (!supported.length) {
    items.push({
      tool: "speckit",
      description: "No selected platform supports Spec Kit integration",
      skip: true,
    });
    return items;
  }

  const integration = speckitInitCommand(supported[0].id, config.repoPath);
  items.push({
    tool: "speckit",
    description: `Initialize Spec Kit in repo (${supported.map((p) => p.label).join(", ")})`,
    command: integration,
    path: path.join(config.repoPath, ".specify"),
    exists: repoFileExists(config.repoPath, ".specify"),
    skip: repoFileExists(config.repoPath, ".specify") && !config.force,
  });

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planUninstallSpeckit(config) {
  const specifyDir = path.join(config.repoPath, ".specify");
  const exists = repoFileExists(config.repoPath, ".specify");
  return [
    {
      tool: "speckit",
      description: exists
        ? "Remove .specify/ directory"
        : ".specify/ not present",
      path: specifyDir,
      exists,
      skip: !exists,
    },
    {
      tool: "speckit",
      description:
        "Note: agent slash-command files from Spec Kit may remain — remove manually if needed",
      skip: true,
    },
  ];
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {Promise<string>}
 */
async function ensureSpecifyCli(config) {
  const hasSpecify =
    config.dryRun || (await commandExists("specify", ["--version"]));

  if (hasSpecify && !config.force) {
    console.log("[speckit] specify-cli already on PATH — skipping uv tool install");
    return "specify-cli already installed";
  }

  console.log("\n[speckit] Installing specify-cli...");
  const install = await run("uv", speckitInstallArgs({ force: true }), {
    dryRun: config.dryRun,
    verbose: config.verbose,
  });
  if (install.code === 0 || config.dryRun) {
    return speckitInstallCommand({ force: true });
  }

  const errText = `${install.stderr}\n${install.stdout}`;
  if ((await commandExists("specify", ["--version"])) && isSpecifyInstallLockError(errText)) {
    console.warn(
      "[speckit] uv could not replace specify-cli (files in use) — continuing with existing install.\n" +
        "  Close other terminals/processes using specify, then re-run with --force to upgrade.",
    );
    return "specify-cli (existing; upgrade skipped — files in use)";
  }

  throw new Error(`specify-cli install failed:\n${errText}`);
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installSpeckit(config) {
  const platforms = resolvePlatforms(config.platforms);
  const supported = platforms.filter((p) => speckitSupportsPlatform(p.id));
  if (!supported.length) {
    throw new Error(
      "No selected platform supports Spec Kit. Try: cursor, claude, codex, copilot, gemini, opencode.",
    );
  }

  const actions = [];
  const uvOk = config.dryRun || (await hasUv());
  if (!uvOk && !config.dryRun) {
    throw new Error("uv required for Spec Kit. Install: winget install astral-sh.uv");
  }

  actions.push(await ensureSpecifyCli(config));

  const primary = supported[0];
  const initArgs = speckitInitArgs(primary.id);
  if (!initArgs) {
    throw new Error(`No Spec Kit integration for platform: ${primary.id}`);
  }

  console.log(`[speckit] specify ${initArgs.join(" ")} (cwd: ${config.repoPath})`);
  const init = await run("specify", initArgs, {
    cwd: config.repoPath,
    dryRun: config.dryRun,
    verbose: true,
  });
  if (init.code !== 0 && !config.dryRun) {
    throw new Error(
      `specify init failed for ${primary.id}:\n${init.stderr || init.stdout}`,
    );
  }
  actions.push(`specify ${initArgs.join(" ")}`);

  return {
    tool: "speckit",
    ok: true,
    summary: actions.join("; "),
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallSpeckit(config) {
  const specifyDir = path.join(config.repoPath, ".specify");
  const actions = [];

  if (deleteDirIfExists(specifyDir, { dryRun: config.dryRun })) {
    actions.push("removed .specify/");
  }

  console.log("\n[speckit] Spec Kit scaffold removed.");
  return {
    tool: "speckit",
    ok: true,
    summary: actions.join("; ") || "nothing to remove",
  };
}

export const speckitPlugin = {
  id: "speckit",
  label: "Spec Kit",
  description: "GitHub spec-driven development (/speckit.* commands)",
  category: "workflow",
  url: "https://github.com/github/spec-kit",
  install: installSpeckit,
  uninstall: uninstallSpeckit,
  planInstall: planInstallSpeckit,
  planUninstall: planUninstallSpeckit,
};
