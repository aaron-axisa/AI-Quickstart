import { PLUGIN_ORDER, UNINSTALL_ORDER } from "../constants.js";
import { cavemanPlugin } from "./caveman.js";
import { cavememPlugin } from "./cavemem.js";
import { graphifyPlugin } from "./graphify.js";
import { karpathyPlugin } from "./karpathy.js";
import { skillsBundlePlugin } from "./skills-bundle.js";
import { speckitPlugin } from "./speckit.js";

/** @type {Record<string, typeof cavemanPlugin>} */
export const PLUGINS = {
  caveman: cavemanPlugin,
  karpathy: karpathyPlugin,
  graphify: graphifyPlugin,
  cavemem: cavememPlugin,
  speckit: speckitPlugin,
  "skills-bundle": skillsBundlePlugin,
};

export function listPlugins() {
  return Object.values(PLUGINS);
}

/** @param {string} id */
export function getPlugin(id) {
  return PLUGINS[id] ?? null;
}

/**
 * @param {string[]} toolIds
 * @param {'install'|'uninstall'} [action]
 */
export function getOrderedPlugins(toolIds, action = "install") {
  const order = action === "uninstall" ? UNINSTALL_ORDER : PLUGIN_ORDER;
  return order.filter((id) => toolIds.includes(id)).map((id) => PLUGINS[id]);
}

/** Group plugins by category for TUI display. */
export function listPluginsByCategory() {
  const order = ["behavior", "context", "memory", "workflow", "skills"];
  /** @type {Record<string, typeof cavemanPlugin[]>} */
  const groups = {};
  for (const pl of listPlugins()) {
    const cat = pl.category ?? "other";
    (groups[cat] ??= []).push(pl);
  }
  return order
    .filter((cat) => groups[cat]?.length)
    .map((cat) => ({ category: cat, plugins: groups[cat] }));
}
