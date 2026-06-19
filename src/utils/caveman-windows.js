import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { getCavemanOnly } from "../platform-maps/caveman.js";
import { run } from "./exec.js";
import { envForChildNodeTools, runNpx } from "./node-runtime.js";

/** Bump when caveman-init.js fetch semantics change. */
const CAVEMAN_INIT_CACHE_VERSION = "1";

/** Upstream providers with dedicated installers (not npx-skills). */
const CAVEMAN_NATIVE_INSTALLERS = new Set([
  "claude",
  "gemini",
  "opencode",
  "openclaw",
]);

/** @returns {boolean} */
export function useNativeCavemanInstall() {
  return process.platform === "win32";
}

/** @deprecated use useNativeCavemanInstall */
export function needsSpacedNodeWorkaround() {
  return useNativeCavemanInstall() && process.execPath.includes(" ");
}

/** @param {string} platformId */
export function platformUsesSkillsInstall(platformId) {
  const only = getCavemanOnly(platformId);
  if (!only) return false;
  return !CAVEMAN_NATIVE_INSTALLERS.has(only);
}

/**
 * @param {import("../platforms.js").PlatformDef[]} platforms
 * @returns {string[]}
 */
function cavemanInitAgentIds(platforms) {
  const seen = new Set();
  /** @type {string[]} */
  const ids = [];
  for (const platform of platforms) {
    const only = getCavemanOnly(platform.id);
    if (!only || seen.has(only)) continue;
    seen.add(only);
    ids.push(only);
  }
  return ids;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {import("../platforms.js").PlatformDef[]} platforms
 */
export async function installCavemanSkillsNative(config, platforms) {
  const repo = UPSTREAM.caveman.repo;
  const cliOpts = {
    cwd: config.repoPath,
    dryRun: config.dryRun,
    verbose: config.verbose,
  };

  for (const platform of platforms) {
    if (!platformUsesSkillsInstall(platform.id)) continue;
    const profile = getCavemanOnly(platform.id);
    if (!profile) continue;

    const args = [
      "-y",
      "skills",
      "add",
      repo,
      "--skill",
      "*",
      "-a",
      profile,
      "--yes",
    ];
    console.log(`[caveman] npx ${args.join(" ")}`);
    const result = await runNpx(args, cliOpts);
    if (result.code !== 0 && !config.dryRun) {
      throw new Error(
        `caveman skills install for ${platform.id} failed (exit ${result.code}).\n${result.stderr || result.stdout}`,
      );
    }
  }
}

/**
 * @returns {Promise<string>}
 */
async function resolveCavemanInitScript() {
  const cache = path.join(
    os.tmpdir(),
    `ai-quickstart-caveman-init-${CAVEMAN_INIT_CACHE_VERSION}.js`,
  );
  if (fs.existsSync(cache)) return cache;

  const url = `https://raw.githubusercontent.com/${UPSTREAM.caveman.repo}/main/src/tools/caveman-init.js`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch caveman-init.js (${res.status})`);
  }
  fs.writeFileSync(cache, await res.text(), "utf8");
  return cache;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {import("../platforms.js").PlatformDef[]} platforms
 * @returns {Promise<boolean>}
 */
export async function runCavemanInitNative(config, platforms) {
  const agentIds = cavemanInitAgentIds(platforms);
  if (!agentIds.length) return true;

  if (config.dryRun) {
    for (const agentId of agentIds) {
      console.log(
        `[dry-run] ${process.execPath} caveman-init.js ${config.repoPath} --only ${agentId}${config.caveman.force ? " --force" : ""}`,
      );
    }
    return true;
  }

  const initPath = await resolveCavemanInitScript();

  for (const agentId of agentIds) {
    /** @type {string[]} */
    const args = [initPath, config.repoPath, "--only", agentId];
    if (config.caveman.force) args.push("--force");

    const result = await run(process.execPath, args, {
      cwd: config.repoPath,
      verbose: config.verbose,
      env: envForChildNodeTools({ strict: true }),
    });
    if (result.code !== 0) return false;
  }

  return true;
}
