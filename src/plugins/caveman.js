import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { getCavemanOnly } from "../platform-maps/caveman.js";
import { resolvePlatforms } from "../platforms.js";
import {
  CAVEMAN_REPO_RULE_FILES,
  CAVEMAN_SKILL_DIRS,
  repoFileExists,
} from "../plan-helpers.js";
import {
  installCavemanSkillsNative,
  needsSpacedNodeWorkaround,
  platformUsesSkillsInstall,
  runCavemanInitNative,
} from "../utils/caveman-windows.js";
import { envForChildNodeTools, runNpx } from "../utils/node-runtime.js";
import {
  deleteDirIfExists,
  deleteFileIfExists,
} from "../utils/fs.js";

/**
 * @param {import("../runner.js").RunConfig} config
 */
function cavemanInstallCommand(config) {
  const platforms = resolvePlatforms(config.platforms);
  const only = platforms
    .map((p) => getCavemanOnly(p.id))
    .filter(Boolean)
    .map((v) => `--only ${v}`)
    .join(" ");
  const flags = [
    only,
    config.caveman.withInit ? "--with-init" : "",
    config.caveman.minimal ? "--minimal" : "",
    config.caveman.force ? "--force" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `npx -y github:${UPSTREAM.caveman.repo} -- --non-interactive ${flags}`.trim();
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planInstallCaveman(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [
    {
      tool: "caveman",
      description: "Run upstream caveman installer",
      command: cavemanInstallCommand(config),
    },
  ];
  if (config.caveman.withInit) {
    for (const rel of CAVEMAN_REPO_RULE_FILES) {
      items.push({
        tool: "caveman",
        description: `Write repo-local rule file`,
        path: path.join(config.repoPath, rel),
        exists: repoFileExists(config.repoPath, rel),
      });
    }
    for (const dir of CAVEMAN_SKILL_DIRS) {
      const rel = `.agents/skills/${dir}`;
      items.push({
        tool: "caveman",
        description: `Install skill directory`,
        path: path.join(config.repoPath, rel),
        exists: repoFileExists(config.repoPath, rel),
      });
    }
  }
  items.push({
    tool: "caveman",
    description: `Platforms: ${platforms.map((p) => p.label).join(", ")}`,
  });
  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planUninstallCaveman(config) {
  const items = [];
  for (const rel of CAVEMAN_REPO_RULE_FILES) {
    const full = path.join(config.repoPath, rel);
    const exists = repoFileExists(config.repoPath, rel);
    items.push({
      tool: "caveman",
      description: exists ? `Remove rule file` : `Rule file not present`,
      path: full,
      exists,
      skip: !exists,
    });
  }
  for (const dir of CAVEMAN_SKILL_DIRS) {
    const rel = `.agents/skills/${dir}`;
    const full = path.join(config.repoPath, rel);
    const exists = repoFileExists(config.repoPath, rel);
    items.push({
      tool: "caveman",
      description: exists ? `Remove skill directory` : `Skill directory not present`,
      path: full,
      exists,
      skip: !exists,
    });
  }
  if (config.caveman.globalUninstall) {
    items.push({
      tool: "caveman",
      description: "Remove global caveman hooks/plugins (user-level)",
      command: `npx -y github:${UPSTREAM.caveman.repo} -- --uninstall --non-interactive`,
    });
  }
  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {import("../platforms.js").PlatformDef[]} platforms
 */
function buildUpstreamCavemanArgs(config, platforms) {
  const args = [
    "-y",
    `github:${UPSTREAM.caveman.repo}`,
    "--",
    "--non-interactive",
  ];

  for (const p of platforms) {
    const only = getCavemanOnly(p.id);
    if (only) args.push("--only", only);
  }

  if (config.caveman.minimal) args.push("--minimal");
  if (config.caveman.force) args.push("--force");
  return args;
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installCaveman(config) {
  const platforms = resolvePlatforms(config.platforms);
  const skillsPlatforms = platforms.filter((p) =>
    platformUsesSkillsInstall(p.id),
  );
  const upstreamPlatforms = platforms.filter(
    (p) => getCavemanOnly(p.id) && !platformUsesSkillsInstall(p.id),
  );
  const useWorkaround =
    needsSpacedNodeWorkaround() && skillsPlatforms.length > 0;

  if (useWorkaround) {
    console.log(
      "\n[caveman] Windows node path has spaces — using direct npx/init (upstream spawn workaround)...",
    );
    await installCavemanSkillsNative(config, skillsPlatforms);

    if (config.caveman.withInit) {
      console.log("\n[caveman] Writing per-repo IDE rule files (--with-init)...");
      const initOk = await runCavemanInitNative(config);
      if (!initOk && !config.dryRun) {
        throw new Error(
          "caveman-init failed. See https://github.com/JuliusBrussee/caveman/issues",
        );
      }
    }

    if (upstreamPlatforms.length === 0) {
      return {
        tool: "caveman",
        ok: true,
        summary: `caveman for ${platforms.map((p) => p.id).join(", ")}`,
      };
    }

    console.log(
      `\n[caveman] Running upstream installer for: ${upstreamPlatforms.map((p) => p.id).join(", ")}`,
    );
  }

  const upstreamTargets = useWorkaround ? upstreamPlatforms : platforms;
  if (!upstreamTargets.length) {
    return {
      tool: "caveman",
      ok: true,
      summary: `caveman for ${platforms.map((p) => p.id).join(", ")}`,
    };
  }

  const args = buildUpstreamCavemanArgs(config, upstreamTargets);
  if (config.caveman.withInit && !useWorkaround) {
    args.push("--with-init");
  }

  console.log("\n[caveman] Installing via upstream installer...");
  const result = await runNpx(args, {
    cwd: config.repoPath,
    dryRun: config.dryRun,
    verbose: config.verbose,
    env: envForChildNodeTools(),
  });

  if (result.code !== 0 && !config.dryRun) {
    throw new Error(
      `caveman install failed (exit ${result.code}). See https://github.com/JuliusBrussee/caveman/issues\n${result.stderr || result.stdout}`,
    );
  }

  return {
    tool: "caveman",
    ok: result.code === 0 || config.dryRun,
    summary: `caveman for ${platforms.map((p) => p.id).join(", ")}`,
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallCaveman(config) {
  const removed = [];

  for (const rel of CAVEMAN_REPO_RULE_FILES) {
    const full = path.join(config.repoPath, rel);
    if (deleteFileIfExists(full, { dryRun: config.dryRun })) {
      removed.push(rel);
    }
  }

  for (const dir of CAVEMAN_SKILL_DIRS) {
    const full = path.join(config.repoPath, ".agents/skills", dir);
    if (deleteDirIfExists(full, { dryRun: config.dryRun })) {
      removed.push(`.agents/skills/${dir}`);
    }
  }

  if (config.caveman.globalUninstall) {
    console.log("\n[caveman] Running upstream global uninstall...");
    const result = await runNpx(
      ["-y", `github:${UPSTREAM.caveman.repo}`, "--", "--uninstall", "--non-interactive"],
      {
        dryRun: config.dryRun,
        verbose: config.verbose,
        env: envForChildNodeTools(),
      },
    );
    if (result.code !== 0 && !config.dryRun) {
      throw new Error(
        `caveman global uninstall failed (exit ${result.code}).\n${result.stderr || result.stdout}`,
      );
    }
    removed.push("global caveman hooks/plugins");
  }

  console.log("\n[caveman] Project-scoped caveman files removed.");
  return {
    tool: "caveman",
    ok: true,
    summary: removed.length ? removed.join(", ") : "nothing to remove",
  };
}

export const cavemanPlugin = {
  id: "caveman",
  label: "Caveman",
  description: "Token-efficient caveman-speak skill (~75% output savings)",
  category: "behavior",
  url: "https://github.com/JuliusBrussee/caveman",
  install: installCaveman,
  uninstall: uninstallCaveman,
  planInstall: planInstallCaveman,
  planUninstall: planUninstallCaveman,
};
