import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { getCavemanOnly } from "../platform-maps/caveman.js";
import { run } from "./exec.js";
import { envForChildNodeTools, runNpx } from "./node-runtime.js";

/** Upstream providers with dedicated installers (not npx-skills). */
const CAVEMAN_NATIVE_INSTALLERS = new Set([
  "claude",
  "gemini",
  "opencode",
  "openclaw",
]);

/** @returns {boolean} */
export function needsSpacedNodeWorkaround() {
  return process.platform === "win32" && process.execPath.includes(" ");
}

/** @param {string} platformId */
export function platformUsesSkillsInstall(platformId) {
  const only = getCavemanOnly(platformId);
  if (!only) return false;
  return !CAVEMAN_NATIVE_INSTALLERS.has(only);
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
    env: envForChildNodeTools(),
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
  const cache = path.join(os.tmpdir(), "ai-quickstart-caveman-init.js");
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
 * @returns {Promise<boolean>}
 */
export async function runCavemanInitNative(config) {
  if (config.dryRun) {
    console.log(
      `[dry-run] ${process.execPath} caveman-init.js ${config.repoPath}${config.caveman.force ? " --force" : ""}`,
    );
    return true;
  }

  const initPath = await resolveCavemanInitScript();
  /** @type {string[]} */
  const args = [initPath, config.repoPath];
  if (config.caveman.force) args.push("--force");

  const result = await run(process.execPath, args, {
    cwd: config.repoPath,
    verbose: config.verbose,
    env: envForChildNodeTools(),
  });
  return result.code === 0;
}
