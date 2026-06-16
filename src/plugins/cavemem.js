import { UPSTREAM } from "../constants.js";
import { resolvePlatforms } from "../platforms.js";
import {
  cavememCommand,
  cavememSupportsPlatform,
} from "../platform-maps/cavemem.js";
import { run, runShell } from "../utils/exec.js";

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planInstallCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [
    {
      tool: "cavemem",
      description: "Install cavemem CLI globally (npm)",
      command: `npm install -g ${UPSTREAM.cavemem.package}`,
    },
  ];

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) {
      items.push({
        tool: "cavemem",
        description: `Cavemem does not support ${platform.label}`,
        skip: true,
      });
      continue;
    }
    const cmd = cavememCommand(platform.id, "install");
    items.push({
      tool: "cavemem",
      description: `Register cavemem for ${platform.label} (user-level hooks/MCP)`,
      command: cmd,
    });
  }

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planUninstallCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [];

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) continue;
    const cmd = cavememCommand(platform.id, "uninstall");
    items.push({
      tool: "cavemem",
      description: `Unregister cavemem for ${platform.label}`,
      command: cmd,
    });
  }

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];

  console.log("\n[cavemem] Installing cavemem globally...");
  const globalInstall = await run(
    "npm",
    ["install", "-g", UPSTREAM.cavemem.package],
    { dryRun: config.dryRun, verbose: config.verbose },
  );
  if (globalInstall.code !== 0 && !config.dryRun) {
    throw new Error(
      `npm install -g ${UPSTREAM.cavemem.package} failed:\n${globalInstall.stderr}`,
    );
  }
  actions.push(`npm install -g ${UPSTREAM.cavemem.package}`);

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) {
      console.log(`[cavemem] Skipping unsupported platform: ${platform.id}`);
      continue;
    }
    const cmd = cavememCommand(platform.id, "install");
    console.log(`[cavemem] ${cmd}`);
    const r = await runShell(cmd, {
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `cavemem install for ${platform.id} failed:\n${r.stderr || r.stdout}`,
      );
    }
    actions.push(cmd);
  }

  if (!config.dryRun) {
    const doctor = await runShell("cavemem doctor", { verbose: config.verbose });
    if (doctor.code !== 0) {
      console.warn("[cavemem] cavemem doctor reported issues — check output above.");
    }
  }

  return {
    tool: "cavemem",
    ok: true,
    summary: actions.join("; "),
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) continue;
    const cmd = cavememCommand(platform.id, "uninstall");
    console.log(`[cavemem] ${cmd}`);
    const r = await runShell(cmd, {
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `cavemem uninstall for ${platform.id} failed:\n${r.stderr || r.stdout}`,
      );
    }
    actions.push(cmd);
  }

  console.log("\n[cavemem] Cavemem unregistered.");
  return {
    tool: "cavemem",
    ok: true,
    summary: actions.join("; ") || "nothing to remove",
  };
}

export const cavememPlugin = {
  id: "cavemem",
  label: "Cavemem",
  description: "Cross-agent persistent memory (local SQLite + MCP)",
  category: "memory",
  url: "https://github.com/JuliusBrussee/cavemem",
  install: installCavemem,
  uninstall: uninstallCavemem,
  planInstall: planInstallCavemem,
  planUninstall: planUninstallCavemem,
};
