import path from "node:path";
import { UNINSTALL_ORDER, PLUGIN_ORDER } from "./constants.js";
import { getOrderedPlugins } from "./plugins/index.js";
import { detectHookConflicts } from "./utils/hooks.js";

/**
 * @typedef {Object} PlanItem
 * @property {string} tool
 * @property {string} description
 * @property {string} [path]
 * @property {string} [command]
 * @property {boolean} [exists]
 * @property {boolean} [skip]
 */

/**
 * @param {import("./runner.js").RunConfig} config
 * @returns {PlanItem[]}
 */
export function buildPlan(config) {
  const plugins = getOrderedPlugins(config.tools, config.action);
  const items = [];
  for (const plugin of plugins) {
    const planner =
      config.action === "uninstall" ? plugin.planUninstall : plugin.planInstall;
    if (planner) {
      items.push(...planner(config));
    }
  }
  return items;
}

/** @param {string[]} tools */
function usesHooks(tools) {
  return tools.some((t) => ["caveman", "graphify", "cavemem"].includes(t));
}

/**
 * @param {import("./runner.js").RunConfig} config
 * @param {PlanItem[]} plan
 */
export function formatPlanPreview(config, plan) {
  const verb = config.action === "uninstall" ? "Uninstall" : "Install";
  const lines = [
    `=== ${verb} preview ===`,
    `Repo:      ${path.resolve(config.repoPath)}`,
    `Tools:     ${config.tools.join(", ")}`,
    `Platforms: ${config.platforms.join(", ")}`,
  ];

  if (config.action === "install") {
    if (config.tools.includes("caveman") && config.caveman.withInit) {
      lines.push("Caveman:   repo-local rules (--with-init)");
    }
    if (config.tools.includes("karpathy") && config.karpathy.mergeClaudeMd) {
      lines.push("Karpathy:  merge CLAUDE.md / AGENTS.md");
    }
    if (config.tools.includes("graphify")) {
      lines.push(
        `Graphify:  ${config.graphify.project ? "project-scoped" : "user-scoped"} install`,
      );
      if (config.graphify.build) lines.push("Graphify:  initial AST graph build");
      if (config.graphify.hooks) lines.push("Graphify:  post-commit hook (--graphify-hooks)");
      if (config.graphify.mcp) lines.push("Graphify:  MCP extra (--graphify-mcp)");
      const extras = [...config.graphify.extras];
      if (config.graphify.mcp && !extras.includes("mcp")) extras.push("mcp");
      if (extras.length) {
        lines.push(`Graphify extras: ${extras.join(", ")}`);
      }
    }
    if (config.tools.includes("skills-bundle")) {
      const skills = config.skillsBundle.skills.length
        ? config.skillsBundle.skills.join(", ")
        : "grill-me, loop-factory, junior-to-senior, interface-kit (defaults)";
      lines.push(`Skills:    ${skills}`);
    }
    if (config.tools.includes("speckit")) {
      lines.push("Spec Kit:  .specify/ scaffold + slash commands");
    }
    if (config.tools.includes("cavemem")) {
      lines.push("Cavemem:   user-level memory hooks/MCP");
    }
  } else {
    if (config.tools.includes("graphify") && config.graphify.purge) {
      lines.push("Graphify:  delete graphify-out/ (--graphify-purge)");
    }
    if (config.tools.includes("caveman") && config.caveman.globalUninstall) {
      lines.push("Caveman:   global hooks/plugins (--caveman-global-uninstall)");
    }
  }

  if (usesHooks(config.tools)) {
    const warnings = detectHookConflicts(config.repoPath);
    if (warnings.length) {
      lines.push("", "Hook warnings:");
      for (const w of warnings) {
        lines.push(`  ⚠ ${w}`);
      }
    }
  }

  lines.push("", "Planned actions:");

  if (!plan.length) {
    lines.push("  (nothing to do)");
    return lines.join("\n");
  }

  const order = config.action === "uninstall" ? UNINSTALL_ORDER : PLUGIN_ORDER;
  const byTool = groupBy(plan, (i) => i.tool);
  for (const toolId of order) {
    if (!config.tools.includes(toolId) || !byTool[toolId]?.length) continue;
    lines.push("", `[${toolId}]`);
    for (const item of byTool[toolId]) {
      const tag = item.skip ? "skip" : item.exists === false ? "absent" : "apply";
      lines.push(`  • [${tag}] ${item.description}`);
      if (item.command) lines.push(`      $ ${item.command}`);
      if (item.path) lines.push(`      ${item.path}`);
    }
  }

  return lines.join("\n");
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(item: T) => string} keyFn
 */
function groupBy(arr, keyFn) {
  /** @type {Record<string, T[]>} */
  const out = {};
  for (const item of arr) {
    const k = keyFn(item);
    (out[k] ??= []).push(item);
  }
  return out;
}
