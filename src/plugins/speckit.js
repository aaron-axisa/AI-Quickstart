import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { resolvePlatforms } from "../platforms.js";
import {
  speckitInitCommand,
  speckitSupportsPlatform,
} from "../platform-maps/speckit.js";
import { repoFileExists } from "../plan-helpers.js";
import { runShell } from "../utils/exec.js";
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
      description: "Install specify-cli globally (uv)",
      command: `uv tool install ${UPSTREAM.speckit.cliPackage} --from "${UPSTREAM.speckit.gitUrl}"`,
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

  const installCmd = `uv tool install ${UPSTREAM.speckit.cliPackage} --from "${UPSTREAM.speckit.gitUrl}"`;
  console.log("\n[speckit] Installing specify-cli...");
  const r = await runShell(installCmd, {
    dryRun: config.dryRun,
    verbose: config.verbose,
  });
  if (r.code !== 0 && !config.dryRun) {
    throw new Error(`specify-cli install failed:\n${r.stderr || r.stdout}`);
  }
  actions.push(installCmd);

  const primary = supported[0];
  const initCmd = speckitInitCommand(primary.id, config.repoPath);
  console.log(`[speckit] ${initCmd} (cwd: ${config.repoPath})`);
  const init = await runShell(initCmd, {
    cwd: config.repoPath,
    dryRun: config.dryRun,
    verbose: config.verbose,
  });
  if (init.code !== 0 && !config.dryRun) {
    throw new Error(
      `specify init failed for ${primary.id}:\n${init.stderr || init.stdout}`,
    );
  }
  actions.push(initCmd);

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
