import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { resolvePlatforms } from "../platforms.js";
import { repoFileExists } from "../plan-helpers.js";
import {
  graphifyInstallCommand,
  graphifyUninstallCommand,
} from "../platform-maps/graphify.js";
import { run, runShell, commandExists } from "../utils/exec.js";
import { deleteDirIfExists, ensureGitignoreBlock } from "../utils/fs.js";
import { augmentPrereqPath, getPythonVersion, resolveUvCommand } from "../utils/detect.js";
import { getUvInstallCommands, installUv } from "../prereqs.js";

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {string[]}
 */
function resolveGraphifyExtras(config) {
  const extras = [...config.graphify.extras];
  if (config.graphify.mcp && !extras.includes("mcp")) {
    extras.push("mcp");
  }
  return extras;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {string}
 */
function graphifyPackageSpecForConfig(config) {
  return graphifyPackageSpec(resolveGraphifyExtras(config));
}

/**
 * @param {string[]} extras
 */
function graphifyPackageSpec(extras) {
  const pkg = UPSTREAM.graphify.package;
  if (!extras.length) return pkg;
  return `${pkg}[${extras.join(",")}]`;
}

/** @param {string} spec */
function graphifyUvInstallArgs(spec) {
  return ["tool", "install", spec];
}

/**
 * Resolve uv or pipx for global graphifyy install. Auto-installs uv when missing.
 * @param {import("../runner.js").RunConfig} config
 * @returns {Promise<{ cmd: string, argsFor: (spec: string) => string[], via: "uv" | "pipx" }>}
 */
export async function resolveGraphifyPackageInstaller(config) {
  augmentPrereqPath();

  const uvCmd = config.dryRun ? "uv" : await resolveUvCommand();
  if (config.dryRun || uvCmd) {
    return {
      cmd: uvCmd ?? "uv",
      via: "uv",
      argsFor: (spec) => graphifyUvInstallArgs(spec),
    };
  }

  console.log("\n[graphify] uv not found — installing uv...");
  await installUv({ dryRun: config.dryRun, verbose: config.verbose });
  augmentPrereqPath();
  const uvAfterInstall = await resolveUvCommand();
  if (uvAfterInstall) {
    return {
      cmd: uvAfterInstall,
      via: "uv",
      argsFor: (spec) => graphifyUvInstallArgs(spec),
    };
  }

  if (await commandExists("pipx")) {
    console.log("[graphify] uv still missing — trying pipx...");
    return {
      cmd: "pipx",
      via: "pipx",
      argsFor: (spec) => ["install", spec],
    };
  }

  const py = await getPythonVersion();
  if (py) {
    const moduleArgs = py.cmd === "py" ? ["-3", "-m", "pipx"] : ["-m", "pipx"];
    if (await commandExists(py.cmd, [...moduleArgs, "--version"])) {
      console.log("[graphify] uv still missing — trying python -m pipx...");
      return {
        cmd: py.cmd,
        via: "pipx",
        argsFor: (spec) => [...moduleArgs, "install", spec],
      };
    }
  }

  const uvHints = getUvInstallCommands()
    .filter((c) => !c.startsWith("#"))
    .join("\n  ");
  throw new Error(
    `[graphify] Neither uv nor pipx available.\n` +
      `Install uv:\n  ${uvHints}\n` +
      `Or: python -m pip install --user pipx`,
  );
}

/** @param {string} spec */
function graphifyUvInstallCommand(spec) {
  return `uv ${graphifyUvInstallArgs(spec).join(" ")}`;
}

/** @type {string} */
export const GRAPHIFY_GITIGNORE_BLOCK =
  "# Graphify generated knowledge graph\ngraphify-out/";

/**
 * @param {import("../runner.js").RunConfig} config
 */
function applyGraphifyGitignore(config) {
  const result = ensureGitignoreBlock(
    config.repoPath,
    "graphify",
    GRAPHIFY_GITIGNORE_BLOCK,
    { dryRun: config.dryRun },
  );
  if (result.status !== "skip") {
    console.log(`[graphify] ${result.status} ${result.path} (graphify-out/)`);
  }
  return result;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planInstallGraphify(config) {
  const platforms = resolvePlatforms(config.platforms);
  const spec = graphifyPackageSpecForConfig(config);
  const items = [
    {
      tool: "graphify",
      description: "Install graphifyy CLI globally (uv or pipx)",
      command: graphifyUvInstallCommand(spec),
    },
  ];

  for (const platform of platforms) {
    const cmd = graphifyInstallCommand(config, platform.id);
    if (!cmd) {
      items.push({
        tool: "graphify",
        description: `No graphify install command for ${platform.label}`,
        skip: true,
      });
      continue;
    }
    items.push({
      tool: "graphify",
      description: `Register graphify for ${platform.label}`,
      command: cmd,
      path: config.repoPath,
    });
  }

  if (config.graphify.build) {
    items.push({
      tool: "graphify",
      description: "Build initial AST-only knowledge graph",
      command: `graphify update "${config.repoPath}" --no-cluster`,
      path: path.join(config.repoPath, "graphify-out"),
    });
  }

  if (config.graphify.hooks) {
    items.push({
      tool: "graphify",
      description: "Install post-commit graph refresh hook",
      command: "graphify hook install",
      path: config.repoPath,
    });
  }

  items.push({
    tool: "graphify",
    description: "Add graphify-out/ to .gitignore",
    path: path.join(config.repoPath, ".gitignore"),
  });

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planUninstallGraphify(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [];

  for (const platform of platforms) {
    const cmd = graphifyUninstallCommand(config, platform.id);
    if (!cmd) {
      items.push({
        tool: "graphify",
        description: `No graphify uninstall command for ${platform.label}`,
        skip: true,
      });
      continue;
    }
    items.push({
      tool: "graphify",
      description: `Unregister graphify for ${platform.label}`,
      command: cmd,
      path: config.repoPath,
    });
  }

  if (config.graphify.purge) {
    const outDir = path.join(config.repoPath, "graphify-out");
    items.push({
      tool: "graphify",
      description: repoFileExists(config.repoPath, "graphify-out")
        ? "Delete graphify-out/ directory"
        : "graphify-out/ not present",
      path: outDir,
      exists: repoFileExists(config.repoPath, "graphify-out"),
      skip: !repoFileExists(config.repoPath, "graphify-out"),
    });
  }

  items.push({
    tool: "graphify",
    description: "Remove graphify post-commit hook (best-effort)",
    command: "graphify hook uninstall",
    path: config.repoPath,
  });

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installGraphify(config) {
  const platforms = resolvePlatforms(config.platforms);
  const spec = graphifyPackageSpecForConfig(config);
  const actions = [];

  const installer = await resolveGraphifyPackageInstaller(config);
  console.log(`\n[graphify] Installing graphifyy via ${installer.via}...`);
  const r = await run(installer.cmd, installer.argsFor(spec), {
    dryRun: config.dryRun,
    verbose: config.verbose,
  });
  if (r.code !== 0 && !config.dryRun) {
    const hint =
      installer.via === "uv"
        ? getUvInstallCommands()
            .filter((c) => !c.startsWith("#"))
            .join("\n  ")
        : "python -m pip install --user pipx";
    throw new Error(
      `${installer.via} install failed. Try:\n  ${hint}\n${r.stderr || r.stdout}`,
    );
  }
  actions.push(
    installer.via === "uv"
      ? graphifyUvInstallCommand(spec)
      : `${installer.cmd} ${installer.argsFor(spec).join(" ")}`,
  );

  for (const platform of platforms) {
    const cmd = graphifyInstallCommand(config, platform.id);
    if (!cmd) {
      console.log(`[graphify] No graphify command for ${platform.id} — skipping`);
      continue;
    }

    console.log(`[graphify] ${cmd} (cwd: ${config.repoPath})`);
    const r = await runShell(cmd, {
      cwd: config.repoPath,
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `graphify install for ${platform.id} failed: ${r.stderr || r.stdout}`,
      );
    }
    actions.push(cmd);
  }

  if (config.graphify.build) {
    const buildCmd = `graphify update "${config.repoPath}" --no-cluster`;
    console.log(`[graphify] Running initial AST graph build...`);
    const r = await runShell(buildCmd, {
      cwd: config.repoPath,
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      console.warn(
        `[graphify] Initial build failed (non-fatal): ${r.stderr || r.stdout}`,
      );
    } else {
      actions.push("initial AST graph build");
    }
  }

  if (config.graphify.hooks) {
    console.log("[graphify] graphify hook install");
    const r = await runShell("graphify hook install", {
      cwd: config.repoPath,
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      console.warn(
        `[graphify] hook install failed (non-fatal): ${r.stderr || r.stdout}`,
      );
    } else {
      actions.push("graphify hook install");
    }
  }

  const gitignore = applyGraphifyGitignore(config);
  if (gitignore.status !== "skip") {
    actions.push(`${gitignore.status} .gitignore (graphify-out/)`);
  }

  return {
    tool: "graphify",
    ok: true,
    summary: actions.join("; "),
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallGraphify(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];

  for (const platform of platforms) {
    const cmd = graphifyUninstallCommand(config, platform.id);
    if (!cmd) continue;

    console.log(`[graphify] ${cmd} (cwd: ${config.repoPath})`);
    const r = await runShell(cmd, {
      cwd: config.repoPath,
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `graphify uninstall for ${platform.id} failed: ${r.stderr || r.stdout}`,
      );
    }
    actions.push(cmd);
  }

  if (config.graphify.purge) {
    const outDir = path.join(config.repoPath, "graphify-out");
    if (deleteDirIfExists(outDir, { dryRun: config.dryRun })) {
      actions.push("removed graphify-out/");
    }
  }

  console.log("[graphify] graphify hook uninstall (best-effort)");
  const hook = await runShell("graphify hook uninstall", {
    cwd: config.repoPath,
    dryRun: config.dryRun,
    verbose: config.verbose,
  });
  if (hook.code === 0 || config.dryRun) {
    actions.push("graphify hook uninstall");
  }

  console.log("\n[graphify] Graphify project integration removed.");
  return {
    tool: "graphify",
    ok: true,
    summary: actions.join("; ") || "nothing to remove",
  };
}

export const graphifyPlugin = {
  id: "graphify",
  label: "Graphify",
  description: "Queryable knowledge graph for your codebase",
  category: "context",
  url: "https://github.com/safishamsi/graphify",
  install: installGraphify,
  uninstall: uninstallGraphify,
  planInstall: planInstallGraphify,
  planUninstall: planUninstallGraphify,
};
