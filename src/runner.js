import path from "node:path";
import {
  checkPrerequisites,
  formatPrereqTable,
  hasBlockingPrereqs,
  installMissingPrerequisites,
} from "./prereqs.js";
import { getOrderedPlugins } from "./plugins/index.js";
import { buildPlan, formatPlanPreview } from "./plan.js";
import { validateRepoPath, isGitRepo } from "./utils/fs.js";

/**
 * @typedef {'install'|'uninstall'} Action
 */

/**
 * @typedef {Object} RunConfig
 * @property {Action} action
 * @property {string} repoPath
 * @property {string[]} tools
 * @property {string[]} platforms
 * @property {boolean} dryRun
 * @property {boolean} verbose
 * @property {boolean} force
 * @property {boolean} installPrerequisites
 * @property {{ withInit: boolean, minimal: boolean, force: boolean, globalUninstall: boolean }} caveman
 * @property {{ mergeClaudeMd: boolean }} karpathy
 * @property {{ project: boolean, build: boolean, extras: string[], purge: boolean, hooks: boolean, mcp: boolean }} graphify
 * @property {Record<string, never>} cavemem
 * @property {Record<string, never>} speckit
 * @property {{ skills: string[] }} skillsBundle
 */

/**
 * @param {RunConfig} config
 * @param {{ skipPlanPreview?: boolean }} [opts]
 */
export async function runAction(config, opts = {}) {
  const validated = validateRepoPath(config.repoPath);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  config.repoPath = validated.resolved;

  if (!isGitRepo(config.repoPath)) {
    console.warn(
      `Warning: ${config.repoPath} is not a git repository. Continuing anyway.`,
    );
  }

  if (!config.tools.length) {
    throw new Error("No tools selected. Use --tools, --preset, or interactive mode.");
  }
  if (!config.platforms.length) {
    throw new Error("No platforms selected. Use --platforms or interactive mode.");
  }

  const plan = buildPlan(config);
  if (!opts.skipPlanPreview) {
    console.log("\n" + formatPlanPreview(config, plan));
  }

  if (config.action === "install") {
    const prereqs = await checkPrerequisites(config.tools);
    console.log("\nPrerequisites:");
    console.log(formatPrereqTable(prereqs));

    if (hasBlockingPrereqs(prereqs)) {
      if (config.installPrerequisites) {
        await installMissingPrerequisites(prereqs, {
          dryRun: config.dryRun,
          verbose: config.verbose,
        });
        const recheck = await checkPrerequisites(config.tools);
        if (hasBlockingPrereqs(recheck)) {
          throw new Error(
            "Required prerequisites still missing after install attempt.",
          );
        }
      } else {
        throw new Error(
          "Missing required prerequisites. Re-run with --install-prerequisites or install manually.",
        );
      }
    }
  }

  const plugins = getOrderedPlugins(config.tools, config.action);
  const verb = config.action === "uninstall" ? "Uninstalling" : "Installing";
  console.log(`\n${verb} in ${config.repoPath}...`);

  const results = [];
  for (const plugin of plugins) {
    console.log(`\n=== ${plugin.label} ===`);
    const fn = config.action === "uninstall" ? plugin.uninstall : plugin.install;
    const result = await fn(config);
    results.push(result);
  }

  console.log("\n=== Done ===");
  for (const r of results) {
    console.log(`  ${r.tool}: ${r.summary}`);
  }

  if (config.dryRun) {
    console.log("\n(dry-run — no changes written)");
  } else {
    const doneVerb = config.action === "uninstall" ? "removed from" : "installed in";
    console.log(`\nAI tools ${doneVerb} ${config.repoPath}`);
    console.log("Re-run is safe. Use upstream docs to customize further.");
  }

  return results;
}

/** @deprecated Use runAction */
export const runInstall = runAction;

/**
 * @param {RunConfig} config
 */
export function buildPreview(config) {
  return formatPlanPreview(config, buildPlan(config));
}

/**
 * @param {RunConfig} config
 */
export function summarizeInstall(config) {
  return buildPreview(config);
}

export { buildPlan, formatPlanPreview };
