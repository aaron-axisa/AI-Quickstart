import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { augmentPrereqPath } from "../utils/detect.js";
import { resolvePlatforms } from "../platforms.js";
import {
  cavememCliArgs,
  cavememCommand,
  cavememSupportsPlatform,
} from "../platform-maps/cavemem.js";
import {
  resolveCavememBin,
  resolveCavememRuntime,
  runCavememCli,
  runNpm,
} from "../utils/node-runtime.js";

const CAVEMEM_PKG = `${UPSTREAM.cavemem.package}@latest`;
const SQLITE_PKG = "better-sqlite3@12.11.1";

/**
 * @param {{ dryRun?: boolean, verbose?: boolean }} opts
 * @returns {Promise<{ ok: boolean, runtime: import("../utils/node-runtime.js").CavememRuntime, stderr: string }>}
 */
async function installCavememGlobal(opts) {
  augmentPrereqPath();
  const runtime = await resolveCavememRuntime();
  const hostMajor = Number(process.versions.node.split(".")[0]);
  const maxNative = UPSTREAM.cavemem.maxNodeForNative ?? 22;

  if (!runtime) {
    return {
      ok: false,
      runtime: { npm: "npm", bin: "cavemem", usesNode20: false },
      stderr:
        "Node 20 side-by-side install not found. Re-run with --install-prerequisites or install Node 20 manually.",
    };
  }

  if (runtime.usesNode20) {
    console.log(
      `[cavemem] Using Node 20 npm at ${runtime.npm} (host Node ${process.versions.node} unchanged)`,
    );
  }

  const args = ["install", "-g", CAVEMEM_PKG];
  if (hostMajor > maxNative) {
    args.push(SQLITE_PKG);
  }

  console.log(`[cavemem] ${runtime.npm} install -g ${CAVEMEM_PKG}...`);
  const res = await runNpm(runtime.npm, args, opts);
  if (res.code !== 0) {
    return {
      ok: false,
      runtime,
      stderr: (res.stderr || res.stdout).trim(),
    };
  }

  if (!opts.dryRun && runtime.usesNode20) {
    const bin = await resolveCavememBin(runtime.npm);
    if (bin) {
      runtime.bin = bin;
      console.log(`[cavemem] Global CLI: ${bin}`);
    }
  }

  return { ok: true, runtime, stderr: "" };
}

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
      command: `npm install -g ${CAVEMEM_PKG}`,
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

function cavememFailureMessage(stderr) {
  return [
    `Cavemem global install failed:\n${stderr}`,
    "",
    "If Node 23+ is active, install side-by-side Node 20 and re-run with --install-prerequisites.",
    "Or skip Cavemem — omit it from --tools.",
  ].join("\n");
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];
  augmentPrereqPath();

  console.log("\n[cavemem] Installing cavemem globally...");
  const globalInstall = await installCavememGlobal({
    dryRun: config.dryRun,
    verbose: config.verbose,
  });

  if (!globalInstall.ok && !config.dryRun) {
    throw new Error(cavememFailureMessage(globalInstall.stderr));
  }

  const runtime = globalInstall.runtime;
  actions.push(`npm install -g ${CAVEMEM_PKG}`);

  const cliOpts = { dryRun: config.dryRun, verbose: config.verbose };

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) {
      console.log(`[cavemem] Skipping unsupported platform: ${platform.id}`);
      continue;
    }
    const args = cavememCliArgs(platform.id, "install");
    if (!args) continue;
    console.log(
      `[cavemem] ${runtime.usesNode20 ? `${runtime.npm} exec -g -- cavemem` : "cavemem"} ${args.join(" ")}`,
    );
    const r = await runCavememCli(runtime, args, cliOpts);
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `cavemem install for ${platform.id} failed:\n${r.stderr || r.stdout}`,
      );
    }
    actions.push(cavememCommand(platform.id, "install", { bin: runtime.bin }) ?? "");
  }

  if (!config.dryRun) {
    const doctor = await runCavememCli(runtime, ["doctor"], cliOpts);
    if (doctor.code !== 0) {
      console.warn("[cavemem] cavemem doctor reported issues — check output above.");
    }
  }

  return {
    tool: "cavemem",
    ok: true,
    summary: actions.filter(Boolean).join("; "),
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];
  augmentPrereqPath();
  const runtime = await resolveCavememRuntime();
  if (!runtime) {
    throw new Error("Cavemem runtime not found for uninstall.");
  }

  const cliOpts = { dryRun: config.dryRun, verbose: config.verbose };

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) continue;
    const args = cavememCliArgs(platform.id, "uninstall");
    if (!args) continue;
    console.log(
      `[cavemem] ${runtime.usesNode20 ? `${runtime.npm} exec -g -- cavemem` : "cavemem"} ${args.join(" ")}`,
    );
    const r = await runCavememCli(runtime, args, cliOpts);
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `cavemem uninstall for ${platform.id} failed:\n${r.stderr || r.stdout}`,
      );
    }
    actions.push(cavememCommand(platform.id, "uninstall", { bin: runtime.bin }) ?? "");
  }

  console.log("\n[cavemem] Cavemem unregistered.");
  return {
    tool: "cavemem",
    ok: true,
    summary: actions.filter(Boolean).join("; ") || "nothing to remove",
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
