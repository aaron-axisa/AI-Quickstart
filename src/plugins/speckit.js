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
  specifyUvToolDirExists,
} from "../platform-maps/speckit.js";
import { repoFileExists } from "../plan-helpers.js";
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
        "Install specify-cli globally (uv; skipped if already available unless --force)",
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
 */
async function isSpecifyCliAvailable(config) {
  if (config.dryRun) return true;
  if (await commandExists("specify", ["--version"])) return true;
  const viaUv = await run(
    "uv",
    ["tool", "run", "--from", "specify-cli", "specify", "--", "--version"],
    { verbose: false },
  );
  return viaUv.code === 0;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {string[]} args
 */
async function runSpecify(config, args) {
  if (config.dryRun) {
    return run("specify", args, {
      cwd: config.repoPath,
      dryRun: true,
      verbose: true,
    });
  }
  if (await commandExists("specify", ["--version"])) {
    return run("specify", args, {
      cwd: config.repoPath,
      verbose: true,
    });
  }
  return run(
    "uv",
    ["tool", "run", "--from", "specify-cli", "specify", "--", ...args],
    { cwd: config.repoPath, verbose: true },
  );
}

/**
 * Install specify-cli only when missing. Never use global --force for uv (avoids
 * Windows file-lock failures when caveman --force is set). Lock errors are non-fatal.
 * @param {import("../runner.js").RunConfig} config
 * @returns {Promise<string>}
 */
async function ensureSpecifyCli(config) {
  if (await isSpecifyCliAvailable(config)) {
    console.log("[speckit] specify-cli already available — skipping uv tool install");
    return "specify-cli already available";
  }

  if (specifyUvToolDirExists()) {
    console.log(
      "[speckit] uv specify-cli tool directory exists — skipping reinstall (avoids Windows file locks)",
    );
    return "specify-cli (uv tool dir present)";
  }

  console.log("\n[speckit] Installing specify-cli...");
  const install = await run("uv", speckitInstallArgs(), {
    dryRun: config.dryRun,
    verbose: config.verbose,
  });
  if (install.code === 0 || config.dryRun) {
    return speckitInstallCommand();
  }

  const errText = `${install.stderr}\n${install.stdout}`;
  if (
    isSpecifyInstallLockError(errText) ||
    specifyUvToolDirExists() ||
    (await isSpecifyCliAvailable(config))
  ) {
    console.warn(
      "[speckit] uv install hit a file lock — continuing with existing specify-cli.\n" +
        "  Close other terminals using specify, then run manually to upgrade:\n" +
        `  ${speckitInstallCommand({ force: true })}`,
    );
    return "specify-cli (existing; uv install skipped — files in use)";
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
  const init = await runSpecify(config, initArgs);
  if (init.code !== 0 && !config.dryRun) {
    const hint =
      specifyUvToolDirExists() && isSpecifyInstallLockError(`${init.stderr}\n${init.stdout}`)
        ? "\n  Close terminals running specify/uv, then re-run."
        : "";
    throw new Error(
      `specify init failed for ${primary.id}:\n${init.stderr || init.stdout}${hint}`,
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
