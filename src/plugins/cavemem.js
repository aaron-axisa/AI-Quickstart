import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { augmentPrereqPath } from "../utils/detect.js";
import { resolvePlatforms } from "../platforms.js";
import {
  cavememCommand,
  cavememSupportsPlatform,
} from "../platform-maps/cavemem.js";
import {
  envWithNode20First,
  resolveCavememRuntime,
  runNpm,
} from "../utils/node-runtime.js";
import { runShell } from "../utils/exec.js";

const CAVEMEM_PKG = `${UPSTREAM.cavemem.package}@latest`;
const SQLITE_PKG = "better-sqlite3@12.11.1";

/**
 * @param {{ dryRun?: boolean, verbose?: boolean }} opts
 * @returns {Promise<{ ok: boolean, bin: string, stderr: string }>}
 */
async function installCavememGlobal(opts) {
  augmentPrereqPath();
  const runtime = await resolveCavememRuntime();
  const hostMajor = Number(process.versions.node.split(".")[0]);
  const maxNative = UPSTREAM.cavemem.maxNodeForNative ?? 22;

  if (!runtime) {
    return {
      ok: false,
      bin: "cavemem",
      stderr:
        "Node 20 side-by-side install not found. Re-run with --install-prerequisites or install Node 20 manually.",
    };
  }

  if (runtime.usesNode20) {
    console.log(
      `[cavemem] Using Node 20 at ${path.dirname(runtime.bin)} (host Node ${process.versions.node} unchanged)`,
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
      bin: runtime.bin,
      stderr: (res.stderr || res.stdout).trim(),
    };
  }

  return { ok: true, bin: runtime.bin, stderr: "" };
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

function cavememShellOpts(runtime, baseOpts = {}) {
  if (!runtime?.usesNode20) return baseOpts;
  return {
    ...baseOpts,
    env: { ...envWithNode20First(runtime.bin), ...baseOpts.env },
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installCavemem(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];
  augmentPrereqPath();
  const runtime = await resolveCavememRuntime();

  console.log("\n[cavemem] Installing cavemem globally...");
  const globalInstall = await installCavememGlobal({
    dryRun: config.dryRun,
    verbose: config.verbose,
  });

  if (!globalInstall.ok && !config.dryRun) {
    throw new Error(cavememFailureMessage(globalInstall.stderr));
  }

  actions.push(`npm install -g ${CAVEMEM_PKG}`);
  const cavememBin = globalInstall.bin;
  const shellOpts = cavememShellOpts(runtime, {
    dryRun: config.dryRun,
    verbose: config.verbose,
  });

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) {
      console.log(`[cavemem] Skipping unsupported platform: ${platform.id}`);
      continue;
    }
    const cmd = cavememCommand(platform.id, "install", { bin: cavememBin });
    console.log(`[cavemem] ${cmd}`);
    const r = await runShell(cmd, shellOpts);
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `cavemem install for ${platform.id} failed:\n${r.stderr || r.stdout}`,
      );
    }
    actions.push(cmd);
  }

  if (!config.dryRun) {
    const doctorCmd =
      cavememBin === "cavemem"
        ? "cavemem doctor"
        : `"${cavememBin}" doctor`;
    const doctor = await runShell(doctorCmd, shellOpts);
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
  augmentPrereqPath();
  const runtime = await resolveCavememRuntime();
  const cavememBin = runtime?.bin ?? "cavemem";
  const shellOpts = cavememShellOpts(runtime, {
    dryRun: config.dryRun,
    verbose: config.verbose,
  });

  for (const platform of platforms) {
    if (!cavememSupportsPlatform(platform.id)) continue;
    const cmd = cavememCommand(platform.id, "uninstall", { bin: cavememBin });
    console.log(`[cavemem] ${cmd}`);
    const r = await runShell(cmd, shellOpts);
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
